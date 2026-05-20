import { createFileRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { useTransition, useState } from 'react'
import { getAdminData, createSession, deleteSession, type WorkshopSessionRow } from '#/lib/admin'
import BetterAuthHeader from '#/integrations/better-auth/header-user'

export const Route = createFileRoute('/admin')({
  loader: () => getAdminData(),
  component: AdminLayout,
})

const SLOTS = [
  { id: 'day1-morning', label: 'Day 1 — Morning (09:00)' },
  { id: 'day1-afternoon', label: 'Day 1 — Afternoon (13:00)' },
  { id: 'day2-morning', label: 'Day 2 — Morning (09:00)' },
]

const SLOT_LABELS = Object.fromEntries(SLOTS.map((s) => [s.id, s.label]))

const GROUP_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-emerald-100 text-emerald-800',
  C: 'bg-violet-100 text-violet-800',
}

const GROUPS = ['A', 'B', 'C']

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateModal({ defaultSlotId, onClose, onCreated }: {
  defaultSlotId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    slotId: defaultSlotId,
    group: 'A',
    topic: '',
    location: '',
    maxParticipants: 30,
  })

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic.trim()) { setError('Topic is required'); return }
    if (form.maxParticipants < 1) { setError('Max participants must be at least 1'); return }
    setError(null)
    setSaving(true)
    startTransition(async () => {
      try {
        await createSession({ data: { ...form } })
        onCreated()
      } catch (err: any) {
        setError(err?.message ?? 'Failed to save')
        setSaving(false)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">New Workshop Session</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Timeslot</label>
              <select
                value={form.slotId}
                onChange={(e) => set('slotId', e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Group</label>
              <select
                value={form.group}
                onChange={(e) => set('group', e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {GROUPS.map((g) => <option key={g} value={g}>Group {g}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Topic <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => set('topic', e.target.value)}
              placeholder="e.g. Sales IT"
              autoFocus
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Room A"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Max participants</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={form.maxParticipants}
              onChange={(e) => set('maxParticipants', Number(e.target.value))}
              className="w-28 border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Admin page ───────────────────────────────────────────────────────────────

function AdminLayout() {
  const { sessions } = Route.useLoaderData()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modalSlot, setModalSlot] = useState<string | null>(null)

  const bySlot = sessions.reduce<Record<string, WorkshopSessionRow[]>>((acc, s) => {
    ;(acc[s.slotId] ??= []).push(s)
    return acc
  }, {})

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteSession({ data: { id } })
      setConfirmId(null)
      setDeletingId(null)
      router.invalidate()
    })
  }

  function handleCreated() {
    setModalSlot(null)
    router.invalidate()
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {modalSlot && (
        <CreateModal
          defaultSlotId={modalSlot}
          onClose={() => setModalSlot(null)}
          onCreated={handleCreated}
        />
      )}

      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors">
              ← Schedule
            </Link>
            <span className="text-neutral-300">|</span>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">Admin — Workshop Sessions</h1>
              <p className="text-xs text-neutral-500">Group IT Conference 2026</p>
            </div>
          </div>
          <BetterAuthHeader />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />

        <div className="space-y-8">
          {SLOTS.map(({ id: slotId, label: slotLabel }) => {
            const slotSessions = bySlot[slotId] ?? []
            return (
              <section key={slotId}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                    {slotLabel}
                  </h2>
                  <button
                    onClick={() => setModalSlot(slotId)}
                    className="flex items-center gap-1 h-7 px-2.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors"
                    title={`Add session to ${SLOT_LABELS[slotId]}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                </div>

                {slotSessions.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic pl-1">No sessions for this slot.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {slotSessions.map((s) => (
                      <div key={s.id} className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GROUP_COLORS[s.group] ?? 'bg-neutral-100 text-neutral-700'}`}>
                            Group {s.group}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Link
                              to="/admin/sessions/$id"
                              params={{ id: s.id }}
                              className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            {confirmId === s.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(s.id)}
                                  disabled={deletingId === s.id}
                                  className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {deletingId === s.id ? '…' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setConfirmId(null)}
                                  className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-700 rounded hover:bg-neutral-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmId(s.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="font-semibold text-neutral-900 text-sm leading-tight">{s.topic}</p>
                          {s.location && (
                            <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {s.location}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100 pt-2 mt-auto">
                          <span className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {s.enrollmentCount} / {s.maxParticipants} enrolled
                          </span>
                          <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min(100, (s.enrollmentCount / s.maxParticipants) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
