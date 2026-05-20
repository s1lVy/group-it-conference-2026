import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { eq, and } from 'drizzle-orm'
import { auth } from '#/lib/auth'
import { db } from '#/db'
import { enrollment } from '#/db/schema'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function requireUser() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

// Used as the route loader — redirects to /login if not signed in
export const getScheduleData = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw redirect({ to: '/login' })
    return db
      .select({ slotId: enrollment.slotId, workshopId: enrollment.workshopId })
      .from(enrollment)
      .where(eq(enrollment.userId, session.user.id))
  },
)

export const enroll = createServerFn({ method: 'POST' })
  .inputValidator((data: { slotId: string; workshopId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser()

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
