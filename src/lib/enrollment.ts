import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { eq, and, count } from 'drizzle-orm'
import { auth } from '#/lib/auth'
import { db } from '#/db'
import { enrollment, workshopSession } from '#/db/schema'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function requireUser() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

export type WorkshopSessionPublic = {
  id: string
  slotId: string
  group: string
  topic: string
  location: string
  maxParticipants: number
  enrollmentCount: number
}

// Used as the route loader — redirects to /login if not signed in
// Returns sessions from DB + this user's enrollments
export const getScheduleData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{
    sessions: WorkshopSessionPublic[]
    enrollments: { slotId: string; workshopId: string }[]
    isAdmin: boolean
  }> => {
    const request = getRequest()
    const authSession = await auth.api.getSession({ headers: request.headers })
    if (!authSession?.user) throw redirect({ to: '/login' })

    const { adminUser } = await import('#/db/schema')
    const admin = await db.query.adminUser.findFirst({
      where: eq(adminUser.userId, authSession.user.id),
    })

    // Get all workshop sessions with enrollment counts
    const sessions = await db
      .select({
        id: workshopSession.id,
        slotId: workshopSession.slotId,
        group: workshopSession.group,
        topic: workshopSession.topic,
        location: workshopSession.location,
        maxParticipants: workshopSession.maxParticipants,
        enrollmentCount: count(enrollment.id),
      })
      .from(workshopSession)
      .leftJoin(enrollment, eq(enrollment.workshopId, workshopSession.id))
      .groupBy(workshopSession.id)
      .orderBy(workshopSession.slotId, workshopSession.group)

    // Get this user's enrollments
    const userEnrollments = await db
      .select({ slotId: enrollment.slotId, workshopId: enrollment.workshopId })
      .from(enrollment)
      .where(eq(enrollment.userId, authSession.user.id))

    return {
      sessions,
      enrollments: userEnrollments,
      isAdmin: !!admin,
    }
  },
)

export const enroll = createServerFn({ method: 'POST' })
  .inputValidator((data: { slotId: string; workshopId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser()

    // Check capacity
    const ws = await db.query.workshopSession.findFirst({
      where: eq(workshopSession.id, data.workshopId),
    })
    if (!ws) throw new Error('Workshop session not found')

    const [{ value: currentCount }] = await db
      .select({ value: count(enrollment.id) })
      .from(enrollment)
      .where(eq(enrollment.workshopId, data.workshopId))

    // Check if user already has an enrollment for this slot (doesn't count toward new capacity)
    const existing = await db.query.enrollment.findFirst({
      where: and(eq(enrollment.userId, user.id), eq(enrollment.slotId, data.slotId)),
    })
    const occupiedByThisUser = existing ? 1 : 0

    if (currentCount - occupiedByThisUser >= ws.maxParticipants) {
      throw new Error('This workshop is full')
    }

    // Replace any existing enrollment for this slot
    await db
      .delete(enrollment)
      .where(and(eq(enrollment.userId, user.id), eq(enrollment.slotId, data.slotId)))

    await db.insert(enrollment).values({
      id: generateId(),
      userId: user.id,
      slotId: data.slotId,
      workshopId: data.workshopId,
    })

    return { ok: true }
  })

export const unenroll = createServerFn({ method: 'POST' })
  .inputValidator((data: { slotId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser()

    await db
      .delete(enrollment)
      .where(and(eq(enrollment.userId, user.id), eq(enrollment.slotId, data.slotId)))

    return { ok: true }
  })
