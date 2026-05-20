import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { eq, sql } from 'drizzle-orm'
import { auth } from '#/lib/auth'
import { db } from '#/db'
import { adminUser, workshopSession, enrollment, agendaSlot, user, feedback } from '#/db/schema'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Map Postgres error codes / constraint names to user-friendly messages.
// Drizzle wraps pg errors — the actual DatabaseError may be on err.cause.
function friendlyDbError(err: unknown): never {
  // Unwrap Drizzle's wrapper: the real pg DatabaseError is on .cause
  const e = ((err as any)?.cause ?? err) as any
  const code: string = e?.code ?? ''
  const constraint: string = e?.constraint ?? ''
  if (code === '23505') {
    if (constraint.includes('slot_group'))
      throw new Error('A session for this group already exists at that time. Choose a different group or time.')
    if (constraint.includes('user_slot'))
      throw new Error('You are already enrolled in a session for this time slot.')
    if (constraint.includes('feedback'))
      throw new Error('You have already submitted feedback for this session.')
    throw new Error('A record with these details already exists.')
  }
  if (code === '23503') throw new Error('This record references something that no longer exists.')
  if (code === '23502') throw new Error('A required field is missing.')
  throw new Error('An unexpected error occurred. Please try again.')
}

// Returns the adminUser row for the current user, or redirects.
async function getAdminRow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) throw redirect({ to: '/login' })
  const row = await db.query.adminUser.findFirst({
    where: eq(adminUser.userId, session.user.id),
  })
  if (!row) throw redirect({ to: '/' })
  return { authUser: session.user, adminRow: row }
}

// Organizer OR admin — can manage sessions and agenda slots.
async function requireOrganizer() {
  const { authUser } = await getAdminRow()
  return authUser
}

// Admin only — can assign roles.
async function requireAdmin() {
  const { authUser, adminRow } = await getAdminRow()
  if (adminRow.role !== 'admin') throw new Error('Forbidden: admin role required')
  return authUser
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'organizer' | 'admin'

export type WorkshopSessionRow = typeof workshopSession.$inferSelect & {
  enrollmentCount: number
}

export type AgendaSlotRow = typeof agendaSlot.$inferSelect

export type EnrolleeRow = {
  userId: string
  name: string
  email: string
  enrolledAt: Date
}

export type FeedbackRow = {
  rating: number
  comment: string | null
  submittedAt: Date
}

export type UserRow = {
  id: string
  name: string
  email: string
  image: string | null
  role: UserRole | null  // null = regular user
}

// ─── Main admin data load ──────────────────────────────────────────────────────

export const getAdminData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ sessions: WorkshopSessionRow[]; agendaSlots: AgendaSlotRow[]; role: UserRole }> => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw redirect({ to: '/login' })
    const row = await db.query.adminUser.findFirst({
      where: eq(adminUser.userId, session.user.id),
    })
    if (!row) throw redirect({ to: '/' })

    const sessions = await db
      .select({
        id: workshopSession.id,
        slotId: workshopSession.slotId,
        group: workshopSession.group,
        topic: workshopSession.topic,
        location: workshopSession.location,
        maxParticipants: workshopSession.maxParticipants,
        createdAt: workshopSession.createdAt,
        updatedAt: workshopSession.updatedAt,
        enrollmentCount: sql<number>`cast(count(${enrollment.id}) as int)`,
      })
      .from(workshopSession)
      .leftJoin(enrollment, eq(enrollment.workshopId, workshopSession.id))
      .groupBy(workshopSession.id)
      .orderBy(workshopSession.slotId, workshopSession.group)

    const agendaSlots = await db
      .select()
      .from(agendaSlot)
      .orderBy(agendaSlot.dayId, agendaSlot.sortOrder)

    return { sessions, agendaSlots, role: row.role as UserRole }
  },
)

// ─── Enrollees for a workshop session ────────────────────────────────────────

export const getEnrollees = createServerFn({ method: 'GET' })
  .inputValidator((data: { workshopId: string }) => data)
  .handler(async ({ data }): Promise<EnrolleeRow[]> => {
    await requireOrganizer()
    const rows = await db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        enrolledAt: enrollment.enrolledAt,
      })
      .from(enrollment)
      .innerJoin(user, eq(enrollment.userId, user.id))
      .where(eq(enrollment.workshopId, data.workshopId))
      .orderBy(enrollment.enrolledAt)
    return rows
  })

// ─── Workshop session CRUD ────────────────────────────────────────────────────

export const getSessionForEdit = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireOrganizer()
    const row = await db.query.workshopSession.findFirst({
      where: eq(workshopSession.id, data.id),
    })
    if (!row) throw new Error('Session not found')
    return row
  })

export const createSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { slotId: string; group: string; topic: string; location: string; maxParticipants: number }) => data)
  .handler(async ({ data }) => {
    await requireOrganizer()
    try {
      await db.insert(workshopSession).values({
        id: generateId(),
        slotId: data.slotId,
        group: data.group,
        topic: data.topic,
        location: data.location.trim() || null,
        maxParticipants: data.maxParticipants,
      })
    } catch (err) { friendlyDbError(err) }
    return { ok: true }
  })

export const updateSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; slotId: string; group: string; topic: string; location: string; maxParticipants: number }) => data)
  .handler(async ({ data }) => {
    await requireOrganizer()
    try {
      await db
        .update(workshopSession)
        .set({
          slotId: data.slotId,
          group: data.group,
          topic: data.topic,
          location: data.location.trim() || null,
          maxParticipants: data.maxParticipants,
          updatedAt: new Date(),
        })
        .where(eq(workshopSession.id, data.id))
    } catch (err) { friendlyDbError(err) }
    return { ok: true }
  })

export const deleteSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireOrganizer()
    await db.delete(workshopSession).where(eq(workshopSession.id, data.id))
    return { ok: true }
  })

// ─── Agenda slot CRUD ─────────────────────────────────────────────────────────

export const createAgendaSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { dayId: string; time: string; title: string; type: string; note: string; location: string; sortOrder: number }) => data)
  .handler(async ({ data }) => {
    await requireOrganizer()
    await db.insert(agendaSlot).values({
      id: generateId(),
      dayId: data.dayId,
      time: data.time,
      title: data.title,
      type: data.type,
      note: data.note.trim() || null,
      location: data.location.trim() || null,
      sortOrder: data.sortOrder,
    })
    return { ok: true }
  })

export const updateAgendaSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; dayId: string; time: string; title: string; type: string; note: string; location: string; sortOrder: number }) => data)
  .handler(async ({ data }) => {
    await requireOrganizer()
    await db
      .update(agendaSlot)
      .set({
        dayId: data.dayId,
        time: data.time,
        title: data.title,
        type: data.type,
        note: data.note.trim() || null,
        location: data.location.trim() || null,
        sortOrder: data.sortOrder,
      })
      .where(eq(agendaSlot.id, data.id))
    return { ok: true }
  })

export const deleteAgendaSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireOrganizer()
    await db.delete(agendaSlot).where(eq(agendaSlot.id, data.id))
    return { ok: true }
  })

// ─── Role management (admin only) ─────────────────────────────────────────────

export const getUsers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UserRow[]> => {
    await requireAdmin()
    const allUsers = await db.select({ id: user.id, name: user.name, email: user.email, image: user.image }).from(user).orderBy(user.name)
    const admins = await db.select({ userId: adminUser.userId, role: adminUser.role }).from(adminUser)
    const roleMap = new Map(admins.map((a) => [a.userId, a.role as UserRole]))
    return allUsers.map((u) => ({ ...u, role: roleMap.get(u.id) ?? null }))
  },
)

export const setUserRole = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; role: UserRole | null }) => data)
  .handler(async ({ data }) => {
    const caller = await requireAdmin()
    if (caller.id === data.userId) throw new Error("You can't change your own role.")
    if (data.role === null) {
      await db.delete(adminUser).where(eq(adminUser.userId, data.userId))
    } else {
      const existing = await db.query.adminUser.findFirst({ where: eq(adminUser.userId, data.userId) })
      if (existing) {
        await db.update(adminUser).set({ role: data.role }).where(eq(adminUser.userId, data.userId))
      } else {
        await db.insert(adminUser).values({ id: generateId(), userId: data.userId, role: data.role })
      }
    }
    return { ok: true }
  })

// ─── Admin check (lightweight, for schedule page) ─────────────────────────────

export const checkIsAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return false
  const row = await db.query.adminUser.findFirst({
    where: eq(adminUser.userId, session.user.id),
  })
  return !!row
})

// ─── Anonymized feedback for a workshop session ───────────────────────────────

export const getFeedbackForSession = createServerFn({ method: 'GET' })
  .inputValidator((data: { workshopId: string }) => data)
  .handler(async ({ data }): Promise<{ rows: FeedbackRow[]; avgRating: number | null; counts: number[] }> => {
    await requireOrganizer()

    const rows = await db
      .select({
        rating: feedback.rating,
        comment: feedback.comment,
        submittedAt: feedback.submittedAt,
      })
      .from(feedback)
      .where(eq(feedback.workshopId, data.workshopId))
      .orderBy(feedback.submittedAt)

    const counts = [1, 2, 3, 4, 5].map((star) => rows.filter((r) => r.rating === star).length)
    const avgRating = rows.length > 0 ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : null

    return { rows, avgRating, counts }
  })

