import { createServerFn } from '@tanstack/react-start'
import { eq, and } from 'drizzle-orm'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { db } from '#/db'
import { feedback, enrollment } from '#/db/schema'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function requireUser() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

export type FeedbackPublic = {
  workshopId: string
  rating: number
  comment: string | null
}

// Submit or update feedback for a workshop the user is enrolled in.
export const submitFeedback = createServerFn({ method: 'POST' })
  .inputValidator((data: { workshopId: string; rating: number; comment?: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser()

    // Must be enrolled in this workshop
    const isEnrolled = await db.query.enrollment.findFirst({
      where: and(
        eq(enrollment.userId, user.id),
        eq(enrollment.workshopId, data.workshopId),
      ),
    })
    if (!isEnrolled) throw new Error('You are not enrolled in this workshop')

    if (data.rating < 1 || data.rating > 5) throw new Error('Rating must be between 1 and 5')

    // Upsert: delete existing then insert
    await db
      .delete(feedback)
      .where(and(eq(feedback.userId, user.id), eq(feedback.workshopId, data.workshopId)))

    await db.insert(feedback).values({
      id: generateId(),
      userId: user.id,
      workshopId: data.workshopId,
      rating: data.rating,
      comment: data.comment ?? null,
    })

    return { ok: true }
  })
