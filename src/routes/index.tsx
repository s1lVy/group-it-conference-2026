import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { useTransition, useState } from 'react'
import BetterAuthHeader from '#/integrations/better-auth/header-user'
import { getScheduleData, enroll, unenroll, type WorkshopSessionPublic, type AgendaSlotPublic } from '#/lib/enrollment'

export const Route = createFileRoute('/')({
  loader: () => getScheduleData(),
  component: Home,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionType = 'workshop' | 'break' | 'plenary' | 'networking'

interface ComputedSlot {
  id: string
  time: string
  title: string
  type: SessionType
  note?: string
  location?: string | null
  isWorkshopSlot?: boolean
  sortOrder: number
}

interface ComputedDay {
  dayId: string
  label: string
  date: string
  slots: ComputedSlot[]
}

// Hardcoded workshop slot definitions — these correspond to workshopSession.slotId values
const WORKSHOP_SLOTS: Record<string, ComputedSlot> = {
  'day1-morning': { id: 'day1-morning', time: '09:00', title: 'Parallel Workshop Sessions — Morning', type: 'workshop', isWorkshopSlot: true, sortOrder: 10 },
  'day1-afternoon': { id: 'day1-afternoon', time: '13:00', title: 'Parallel Workshop Sessions — Afternoon', type: 'workshop', isWorkshopSlot: true, sortOrder: 30 },
  'day2-morning': { id: 'day2-morning', time: '09:00', title: 'Parallel Workshop Sessions — Morning', type: 'workshop', isWorkshopSlot: true, sortOrder: 10 },
}

const DAY_META: Record<string, { label: string; date: string; workshopSlots: string[] }> = {
  day1: { label: 'Day 1', date: 'Wednesday, 10 June 2026', workshopSlots: ['day1-morning', 'day1-afternoon'] },
  day2: { label: 'Day 2', date: 'Thursday, 11 June 2026', workshopSlots: ['day2-morning'] },
}

function buildAgenda(agendaSlots: AgendaSlotPublic[]): ComputedDay[] {
  const days: ComputedDay[] = []
  for (const [dayId, meta] of Object.entries(DAY_META)) {
    const dbSlots: ComputedSlot[] = agendaSlots
      .filter((s) => s.dayId === dayId)
      .map((s) => ({
        id: s.id,
        time: s.time,
        title: s.title,
        type: s.type as SessionType,
        note: s.note ?? undefined,
        location: s.location,
        sortOrder: s.sortOrder,
      }))
    const workshopSlots = meta.workshopSlots.map((sid) => WORKSHOP_SLOTS[sid]).filter(Boolean)
    const allSlots = [...workshopSlots, ...dbSlots].sort((a, b) => a.sortOrder - b.sortOrder)
    days.push({ dayId, label: meta.label, date: meta.date, slots: allSlots })
  }
  return days
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  A: 'bg-blue-50 text-blue-900 border-blue-200',
  B: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  C: 'bg-violet-50 text-violet-900 border-violet-200',
}

const GROUP_BADGE: Record<string, string> = {
  A: 'bg-blue-600 text-white',
  B: 'bg-emerald-600 text-white',
  C: 'bg-violet-600 text-white',
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

function TypePill({ type }: { type: SessionType }) {
  return (
    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_PILL[type]}`}>
      {TYPE_LABEL[type]}
    </span>
  )
}

function WorkshopCard({
  ws,
  slotId,
  enrolled,
  full,
  onEnroll,
  onUnenroll,
  pending,
}: {
  ws: WorkshopSessionPublic
  slotId: string
  enrolled: boolean
  full: boolean
  onEnroll: (slotId: string, workshopId: string) => void
  onUnenroll: (slotId: string) => void
  pending: boolean
}) {
  const pct = Math.min(100, (ws.enrollmentCount / ws.maxParticipants) * 100)
  const colors = GROUP_COLORS[ws.group] ?? 'bg-neutral-50 text-neutral-900 border-neutral-200'
  const badge = GROUP_BADGE[ws.group] ?? 'bg-neutral-600 text-white'

  return (
    <div className={`rounded-lg border px-4 py-3 flex flex-col gap-2 transition-all ${colors} ${enrolled ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${badge}`}>
          {ws.group}
        </span>
        <span className="text-xs font-semibold opacity-70">Group {ws.group}</span>
        {enrolled && (
          <span className="ml-auto text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
            Enrolled
          </span>
        )}
      </div>

      <p className="text-sm font-semibold leading-tight">{ws.topic}</p>

      <p className="text-xs opacity-60 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {ws.location}
      </p>

      {/* Capacity bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs opacity-60 shrink-0">{ws.enrollmentCount}/{ws.maxParticipants}</span>
      </div>

      {enrolled ? (
        <button
          disabled={pending}
          onClick={() => onUnenroll(slotId)}
          className="mt-1 w-full text-xs font-medium py-1.5 rounded border border-current opacity-60 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Remove enrollment'}
        </button>
      ) : (
        <button
          disabled={pending || (full && !enrolled)}
          onClick={() => onEnroll(slotId, ws.id)}
          className="mt-1 w-full text-xs font-medium py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : full ? 'Full' : 'Enroll'}
        </button>
      )}
    </div>
  )
}

function SlotCard({
  slot,
  workshops,
  enrollments,
  onEnroll,
  onUnenroll,
  pendingSlot,
}: {
  slot: ComputedSlot
  workshops: WorkshopSessionPublic[]
  enrollments: Record<string, string>
  onEnroll: (slotId: string, workshopId: string) => void
  onUnenroll: (slotId: string) => void
  pendingSlot: string | null
}) {
  const enrolledWorkshopId = enrollments[slot.id]

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

        {slot.isWorkshopSlot && (
          workshops.length === 0 ? (
            <p className="text-sm text-neutral-400 italic mt-2">No sessions scheduled yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              {workshops.map((ws) => (
                <WorkshopCard
                  key={ws.id}
                  ws={ws}
                  slotId={slot.id}
                  enrolled={enrolledWorkshopId === ws.id}
                  full={ws.enrollmentCount >= ws.maxParticipants && enrolledWorkshopId !== ws.id}
                  onEnroll={onEnroll}
                  onUnenroll={onUnenroll}
                  pending={pendingSlot === slot.id}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function Home() {
  const { sessions, enrollments: enrollmentList, agendaSlots, isAdmin } = Route.useLoaderData()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pendingSlot, setPendingSlot] = useState<string | null>(null)
  const [enrollError, setEnrollError] = useState<string | null>(null)

  // Build slotId → workshopId map
  const enrollments: Record<string, string> = {}
  for (const e of enrollmentList) {
    enrollments[e.slotId] = e.workshopId
  }

  // Build slotId → sessions map
  const sessionsBySlot: Record<string, WorkshopSessionPublic[]> = {}
  for (const s of sessions) {
    ;(sessionsBySlot[s.slotId] ??= []).push(s)
  }

  const agenda = buildAgenda(agendaSlots)

  function handleEnroll(slotId: string, workshopId: string) {
    setPendingSlot(slotId)
    setEnrollError(null)
    startTransition(async () => {
      try {
        await enroll({ data: { slotId, workshopId } })
        router.invalidate()
      } catch (err: any) {
        setEnrollError(err?.message ?? 'Failed to enroll')
      } finally {
        setPendingSlot(null)
      }
    })
  }

  function handleUnenroll(slotId: string) {
    setPendingSlot(slotId)
    setEnrollError(null)
    startTransition(async () => {
      try {
        await unenroll({ data: { slotId } })
        router.invalidate()
      } finally {
        setPendingSlot(null)
      }
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
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="h-8 px-3 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin
              </Link>
            )}
            <BetterAuthHeader />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">Event Schedule</h2>
          <p className="text-neutral-500 text-sm">Select one workshop per parallel session to enroll.</p>
        </div>

        {/* Event info box */}
        <div className="mb-8 rounded-xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
          <div className="bg-indigo-600 px-5 py-3">
            <p className="text-white font-bold text-base tracking-wide">GroupIT — Porsche Holding Salzburg</p>
          </div>
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center leading-none">
                <p className="text-4xl font-black text-indigo-600">10 – 11</p>
                <p className="text-sm font-semibold text-neutral-500 mt-1 uppercase tracking-widest">June 2026</p>
              </div>
              <div className="w-px h-12 bg-neutral-200 hidden sm:block" />
            </div>
            <div className="flex flex-col gap-1 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-900">Wyndham Grand Salzburg Conference Centre</p>
              <p className="text-neutral-500">Fanny-von-Lehnert-Strasse 7, 5020 Salzburg, Austria</p>
              <p className="flex items-center gap-1 text-neutral-400 text-xs mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Salzburg, Austria
              </p>
            </div>
          </div>
        </div>

        {enrollError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {enrollError}
          </div>
        )}

        <GroupLegend />

        <div className="space-y-10">
          {agenda.map((day) => (
            <section key={day.dayId}>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">{day.label}</div>
                <h2 className="text-lg font-semibold text-neutral-800">{day.date}</h2>
              </div>
              <div className="space-y-3">
                {day.slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    workshops={sessionsBySlot[slot.id] ?? []}
                    enrollments={enrollments}
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
