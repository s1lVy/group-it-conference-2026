import { createFileRoute } from '@tanstack/react-router'
import BetterAuthHeader from '#/integrations/better-auth/header-user'

export const Route = createFileRoute('/')({ component: Home })

type SessionType = 'workshop' | 'break' | 'plenary' | 'networking'

interface GroupAssignment {
  group: 'A' | 'B' | 'C' | 'all'
  topic: string
  location?: string
}

interface ScheduleItem {
  time: string
  title: string
  type: SessionType
  groups?: GroupAssignment[]
  note?: string
}

interface Day {
  day: string
  date: string
  items: ScheduleItem[]
}

const GROUP_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-800 border-blue-200',
  B: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  C: 'bg-violet-100 text-violet-800 border-violet-200',
  all: 'bg-amber-100 text-amber-800 border-amber-200',
}

const GROUP_BADGE: Record<string, string> = {
  A: 'bg-blue-600 text-white',
  B: 'bg-emerald-600 text-white',
  C: 'bg-violet-600 text-white',
  all: 'bg-amber-500 text-white',
}

const TYPE_STYLES: Record<SessionType, string> = {
  workshop: 'border-l-4 border-l-indigo-400',
  break: 'border-l-4 border-l-neutral-300 bg-neutral-50',
  plenary: 'border-l-4 border-l-amber-400',
  networking: 'border-l-4 border-l-rose-400',
}

const agenda: Day[] = [
  {
    day: 'Day 1',
    date: 'Wednesday, 10 June 2026',
    items: [
      {
        time: '09:00',
        title: 'Parallel Workshop Sessions — Morning',
        type: 'workshop',
        groups: [
          { group: 'A', topic: 'Sales IT', location: 'Room A' },
          { group: 'B', topic: 'Digital Business', location: 'Room B' },
          { group: 'C', topic: 'AfterSales', location: 'Room C' },
        ],
      },
      {
        time: '12:00',
        title: 'Lunch Break',
        type: 'break',
        note: 'All groups',
      },
      {
        time: '13:00',
        title: 'Parallel Workshop Sessions — Afternoon',
        type: 'workshop',
        groups: [
          { group: 'B', topic: 'Sales IT', location: 'Room A' },
          { group: 'C', topic: 'Digital Business', location: 'Room B' },
          { group: 'A', topic: 'AfterSales', location: 'Room C' },
        ],
      },
      {
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
    items: [
      {
        time: '09:00',
        title: 'Parallel Workshop Sessions — Morning',
        type: 'workshop',
        groups: [
          { group: 'C', topic: 'Sales IT (Wheels)', location: 'Room A' },
          { group: 'A', topic: 'Digital Business', location: 'Room B' },
          { group: 'B', topic: 'AfterSales', location: 'Room C' },
        ],
      },
      {
        time: '12:00',
        title: 'Lunch Break',
        type: 'break',
        note: 'All groups',
      },
      {
        time: '13:00',
        title: 'QA-Sessions & Wrap Up',
        type: 'plenary',
        groups: [
          { group: 'all', topic: 'All Groups', location: 'Main Hall' },
        ],
        note: 'Plenary',
      },
    ],
  },
]

function GroupBadge({ group }: { group: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${GROUP_BADGE[group]}`}>
      {group === 'all' ? '★' : group}
    </span>
  )
}

function SessionCard({ item }: { item: ScheduleItem }) {
  return (
    <div className={`rounded-lg bg-white shadow-sm border border-neutral-200 overflow-hidden ${TYPE_STYLES[item.type]}`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">{item.time}</p>
            <h3 className="text-base font-semibold text-neutral-900">{item.title}</h3>
            {item.note && (
              <p className="text-xs text-neutral-500 mt-0.5">{item.note}</p>
            )}
          </div>
          <TypePill type={item.type} />
        </div>

        {item.groups && item.groups.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {item.groups.map((g) => (
              <div
                key={g.group + g.topic}
                className={`rounded-md border px-3 py-2.5 ${GROUP_COLORS[g.group]}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <GroupBadge group={g.group} />
                  <span className="text-xs font-semibold">
                    {g.group === 'all' ? 'All Groups' : `Group ${g.group}`}
                  </span>
                </div>
                <p className="text-sm font-medium leading-tight">{g.topic}</p>
                {g.location && (
                  <p className="text-xs mt-1 opacity-70 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="inline w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {g.location}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypePill({ type }: { type: SessionType }) {
  const labels: Record<SessionType, string> = {
    workshop: 'Workshop',
    break: 'Break',
    plenary: 'Plenary',
    networking: 'Networking',
  }
  const colors: Record<SessionType, string> = {
    workshop: 'bg-indigo-100 text-indigo-700',
    break: 'bg-neutral-100 text-neutral-500',
    plenary: 'bg-amber-100 text-amber-700',
    networking: 'bg-rose-100 text-rose-700',
  }
  return (
    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${colors[type]}`}>
      {labels[type]}
    </span>
  )
}

function GroupLegend() {
  const groups = [
    { id: 'A', label: 'Group A', color: 'bg-blue-600' },
    { id: 'B', label: 'Group B', color: 'bg-emerald-600' },
    { id: 'C', label: 'Group C', color: 'bg-violet-600' },
  ]
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {groups.map((g) => (
        <div key={g.id} className="flex items-center gap-2 text-sm text-neutral-600">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${g.color}`}>{g.id}</span>
          {g.label}
        </div>
      ))}
    </div>
  )
}

function Home() {
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">Event Schedule</h2>
          <p className="text-neutral-500 text-sm">Parallel workshop sessions rotate across three groups</p>
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
                {day.items.map((item) => (
                  <SessionCard key={item.time + item.title} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
