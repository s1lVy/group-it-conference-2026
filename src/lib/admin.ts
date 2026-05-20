import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { eq, sql } from 'drizzle-orm'
import { auth } from '#/lib/auth'
import { db } from '#/db'
import { adminUser, workshopSession, enrollment, agendaSlot, user } from '#/db/schema'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function requireAdmin() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) throw redirect({ to: '/login' })
  const admin = await db.query.adminUser.findFirst({
    where: eq(adminUser.userId, session.user.id),
  })
  if (!admin) throw redirect({ to: '/' })
  return session.user
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Main admin data load ──────────────────────────────────────────────────────

export const getAdminData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ sessions: WorkshopSessionRow[]; agendaSlots: AgendaSlotRow[]; isAdmin: boolean }> => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw redirect({ to: '/login' })
    const admin = await db.query.adminUser.findFirst({
      where: eq(adminUser.userId, session.user.id),
    })
    if (!admin) throw redirect({ to: '/' })

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

    return { sessions, agendaSlots, isAdmin: true }
  },
)

// ─── Enrollees for a workshop session ────────────────────────────────────────

export const getEnrollees = createServerFn({ method: 'GET' })
  .inputValidator((data: { workshopId: string }) => data)
  .handler(async ({ data }): Promise<EnrolleeRow[]> => {
    await requireAdmin()
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
    await requireAdmin()
    const row = await db.query.workshopSession.findFirst({
      where: eq(workshopSession.id, data.id),
    })
    if (!row) throw new Error('Session not found')
    return row
  })

export const createSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { slotId: string; group: string; topic: string; location: string; maxParticipants: number }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    await db.insert(workshopSession).values({
      id: generateId(),
      slotId: data.slotId,
      group: data.group,
      topic: data.topic,
      location: data.location.trim() || null,
      maxParticipants: data.maxParticipants,
    })
    return { ok: true }
  })

export const updateSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; slotId: string; group: string; topic: string; location: string; maxParticipants: number }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
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
    return { ok: true }
  })

export const deleteSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    await db.delete(workshopSession).where(eq(workshopSession.id, data.id))
    return { ok: true }
  })

// ─── Agenda slot CRUD ─────────────────────────────────────────────────────────

export const createAgendaSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { dayId: string; time: string; title: string; type: string; note: string; location: string; sortOrder: number }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
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
    await requireAdmin()
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
    await requireAdmin()
    await db.delete(agendaSlot).where(eq(agendaSlot.id, data.id))
    return { ok: true }
  })

// ─── Admin check (lightweight, for schedule page) ─────────────────────────────

export const checkIsAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return false
  const admin = await db.query.adminUser.findFirst({
    where: eq(adminUser.userId, session.user.id),
  })
  return !!admin
})
