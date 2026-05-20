import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useTransition } from 'react'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import BetterAuthHeader from '#/integrations/better-auth/header-user'
import { authClient } from '#/lib/auth-client'
import { getMyEnrollments, enroll, unenroll } from '#/lib/enrollment'

export const Route = createFileRoute('/')({
  loader: async () => {
    const session = await auth.api.getSession({ headers: getRequest().headers })
    if (!session?.user) throw redirect({ to: '/login' })
    return getMyEnrollments()
  },
  component: Home,
})

// ─── Agenda data ─────────────────────────────────────────────────────────────

type SessionType = 'workshop' | 'break' | 'plenary' | 'networking'

interface Workshop {
  id: string
  group: 'A' | 'B' | 'C' | 'all'
  topic: string
  location: string
}

interface Slot {
  id: string
  time: string
  title: string
  type: SessionType
  workshops?: Workshop[]
  note?: string
}

interface Day {
  day: string
  date: string
  slots: Slot[]
}

const agenda: Day[] = [
  {
    day: 'Day 1',
    date: 'Wednesday, 10 June 2026',
    slots: [
      {
        id: 'day1-morning',
        time: '09:00',
        title: 'Parallel Workshop Sessions — Morning',
        type: 'workshop',
        workshops: [
          { id: 'sales-it', group: 'A', topic: 'Sales IT', location: 'Room A' },
          { id: 'digital-business', group: 'B', topic: 'Digital Business', location: 'Room B' },
          { id: 'aftersales', group: 'C', topic: 'AfterSales', location: 'Room C' },
        ],
      },
      {
        id: 'day1-lunch',
        time: '12:00',
        title: 'Lunch Break',
        type: 'break',
        note: 'All groups',
      },
      {
        id: 'day1-afternoon',
        time: '13:00',
        title: 'Parallel Workshop Sessions — Afternoon',
        type: 'workshop',
        workshops: [
          { id: 'sales-it', group: 'B', topic: 'Sales IT', location: 'Room A' },
          { id: 'digital-business', group: 'C', topic: 'Digital Business', location: 'Room B' },
          { id: 'aftersales', group: 'A', topic: 'AfterSales', location: 'Room C' },
        ],
      },
      {
        id: 'day1-evening',
        time: 'Evening',
        title: 'Dinner & Networking',
        type: 'networking',
        note: 'All groups',
      },
    ],
  },
  {
    day: 'Day 2',
    date: 'Thursday, 11 June 2026',
    slots: [
      {
        id: 'day2-morning',
        time: '09:00',
        title: 'Parallel Workshop Sessions — Morning',
        type: 'workshop',
        workshops: [
          { id: 'sales-it-wheels', group: 'C', topic: 'Sales IT (Wheels)', location: 'Room A' },
          { id: 'digital-business', group: 'A', topic: 'Digital Business', location: 'Room B' },
          { id: 'aftersales', group: 'B', topic: 'AfterSales', location: 'Room C' },
        ],
      },
      {
        id: 'day2-lunch',
        time: '12:00',
        title: 'Lunch Break',
        type: 'break',
        note: 'All groups',
      },
      {
        id: 'day2-plenary',
        time: '13:00',
        title: 'QA-Sessions & Wrap Up',
        type: 'plenary',
        note: 'Plenary — All Groups — Main Hall',
      },
    ],
  },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  A: 'bg-blue-50 text-blue-900 border-blue-200',
  B: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  C: 'bg-violet-50 text-violet-900 border-violet-200',
  all: 'bg-amber-50 text-amber-900 border-amber-200',
}

const GROUP_BADGE: Record<string, string> = {
  A: 'bg-blue-600 text-white',
  B: 'bg-emerald-600 text-white',
  C: 'bg-violet-600 text-white',
  all: 'bg-amber-500 text-white',
}

const TYPE_BORDER: Record<SessionType, string> = {
  workshop: 'border-l-4 border-l-indigo-400',
  break: 'border-l-4 border-l-neutral-300 bg-neutral-50',
  plenary: 'border-l-4 border-l-amber-400',
  networking: 'border-l-4 border-l-rose-400',
}

const TYPE_PILL: Record<SessionType, string> = {
  workshop: 'bg-indigo-100 text-indigo-700',
  break: 'bg-neutral-100 text-neutral-500',
  plenary: 'bg-amber-100 text-amber-700',
  networking: 'bg-rose-100 text-rose-700',
}

const TYPE_LABEL: Record<SessionType, string> = {
  workshop: 'Workshop',
  break: 'Break',
  plenary: 'Plenary',
  networking: 'Networking',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GroupBadge({ group }: { group: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${GROUP_BADGE[group]}`}>
      {group === 'all' ? '★' : group}
    </span>
  )
}

function TypePill({ type }: { type: SessionType }) {
  return (
    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_PILL[type]}`}>
      {TYPE_LABEL[type]}
    </span>
  )
}

function GroupLegend() {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {(['A', 'B', 'C'] as const).map((g) => (
        <div key={g} className="flex items-center gap-2 text-sm text-neutral-600">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${GROUP_BADGE[g]}`}>{g}</span>
          Group {g}
        </div>
      ))}
    </div>
  )
}

// ─── Workshop card with enroll button ─────────────────────────────────────────

function WorkshopCard({
  workshop,
  slotId,
  enrolled,
  isSignedIn,
  onEnroll,
  onUnenroll,
  pending,
}: {
  workshop: Workshop
  slotId: string
  enrolled: boolean
  isSignedIn: boolean
  onEnroll: (slotId: string, workshopId: string) => void
  onUnenroll: (slotId: string) => void
  pending: boolean
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 flex flex-col gap-2 transition-all ${GROUP_COLORS[workshop.group]} ${enrolled ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}>
      <div className="flex items-center gap-2">
        <GroupBadge group={workshop.group} />
        <span className="text-xs font-semibold opacity-70">Group {workshop.group}</span>
        {enrolled && (
          <span className="ml-auto text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
            Enrolled
          </span>
        )}
      </div>

      <p className="text-sm font-semibold leading-tight">{workshop.topic}</p>

      <p className="text-xs opacity-60 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {workshop.location}
      </p>

      {isSignedIn && (
        enrolled ? (
          <button
            disabled={pending}
            onClick={() => onUnenroll(slotId)}
            className="mt-1 w-full text-xs font-medium py-1.5 rounded border border-current opacity-60 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
          >
            {pending ? 'Saving…' : 'Remove enrollment'}
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() => onEnroll(slotId, workshop.id)}
            className="mt-1 w-full text-xs font-medium py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Saving…' : 'Enroll'}
          </button>
        )
      )}

      {!isSignedIn && (
        <p className="text-xs opacity-50 italic">Sign in to enroll</p>
      )}
    </div>
  )
}

// ─── Slot card ────────────────────────────────────────────────────────────────

function SlotCard({
  slot,
  enrollments,
  isSignedIn,
  onEnroll,
  onUnenroll,
  pendingSlot,
}: {
  slot: Slot
  enrollments: Record<string, string>
  isSignedIn: boolean
  onEnroll: (slotId: string, workshopId: string) => void
  onUnenroll: (slotId: string) => void
  pendingSlot: string | null
}) {
  const enrolledWorkshop = enrollments[slot.id]

  return (
    <div className={`rounded-xl bg-white shadow-sm border border-neutral-200 overflow-hidden ${TYPE_BORDER[slot.type]}`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">{slot.time}</p>
            <h3 className="text-base font-semibold text-neutral-900">{slot.title}</h3>
            {slot.note && <p className="text-xs text-neutral-500 mt-0.5">{slot.note}</p>}
          </div>
          <TypePill type={slot.type} />
        </div>

        {slot.workshops && slot.workshops.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {slot.workshops.map((w) => (
              <WorkshopCard
                key={w.id}
                workshop={w}
                slotId={slot.id}
                enrolled={enrolledWorkshop === w.id}
                isSignedIn={isSignedIn}
                onEnroll={onEnroll}
                onUnenroll={onUnenroll}
                pending={pendingSlot === slot.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function Home() {
  const initialEnrollments = Route.useLoaderData()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const isSignedIn = !!session?.user
  const [, startTransition] = useTransition()
  const [pendingSlot, setPendingSlot] = React.useState<string | null>(null)

  // Build a slotId → workshopId map from loader data
  const enrollments: Record<string, string> = {}
  for (const e of initialEnrollments) {
    enrollments[e.slotId] = e.workshopId
  }

  function handleEnroll(slotId: string, workshopId: string) {
    setPendingSlot(slotId)
    startTransition(async () => {
      await enroll({ data: { slotId, workshopId } })
      router.invalidate()
      setPendingSlot(null)
    })
  }

  function handleUnenroll(slotId: string) {
    setPendingSlot(slotId)
    startTransition(async () => {
      await unenroll({ data: { slotId } })
      router.invalidate()
      setPendingSlot(null)
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Group IT Conference 2026</h1>
            <p className="text-xs text-neutral-500 mt-0.5">10–11 June 2026</p>
          </div>
          <BetterAuthHeader />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">Event Schedule</h2>
          <p className="text-neutral-500 text-sm">
            {isSignedIn
              ? 'Select one workshop per parallel session to enroll.'
              : 'Sign in to enroll in workshop sessions.'}
          </p>
        </div>

        <GroupLegend />

        <div className="space-y-10">
          {agenda.map((day) => (
            <section key={day.day}>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">{day.day}</div>
                <h2 className="text-lg font-semibold text-neutral-800">{day.date}</h2>
              </div>
              <div className="space-y-3">
                {day.slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    enrollments={enrollments}
                    isSignedIn={isSignedIn}
                    onEnroll={handleEnroll}
                    onUnenroll={handleUnenroll}
                    pendingSlot={pendingSlot}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

// Need React in scope for useTransition
import React from 'react'
