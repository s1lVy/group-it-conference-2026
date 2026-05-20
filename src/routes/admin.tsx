import { createFileRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { useTransition, useState } from 'react'
import {
  getAdminData,
  getEnrollees,
  getFeedbackForSession,
  createSession,
  updateSession,
  getSessionForEdit,
  deleteSession,
  createAgendaSlot,
  updateAgendaSlot,
  deleteAgendaSlot,
  type WorkshopSessionRow,
  type AgendaSlotRow,
  type EnrolleeRow,
  type FeedbackRow,
} from '#/lib/admin'
import BetterAuthHeader from '#/integrations/better-auth/header-user'

export const Route = createFileRoute('/admin')({
  loader: () => getAdminData(),
  component: AdminLayout,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { id: 'day1', label: 'Day 1', date: 'Wednesday, 10 June 2026' },
  { id: 'day2', label: 'Day 2', date: 'Thursday, 11 June 2026' },
]

const GROUP_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-emerald-100 text-emerald-800',
  C: 'bg-violet-100 text-violet-800',
}

const GROUPS = ['A', 'B', 'C']

const SLOT_TYPES = [
  { value: 'break', label: 'Break' },
  { value: 'plenary', label: 'Plenary' },
  { value: 'networking', label: 'Networking' },
]

const TYPE_PILL: Record<string, string> = {
  break: 'bg-neutral-100 text-neutral-600',
  plenary: 'bg-amber-100 text-amber-700',
  networking: 'bg-rose-100 text-rose-700',
}

// ─── Enrollee panel (slide-in) ────────────────────────────────────────────────

function EnrolleePanel({ workshopId, topic, onClose }: {
  workshopId: string
  topic: string
  onClose: () => void
}) {
  const [enrollees, setEnrollees] = useState<EnrolleeRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    getEnrollees({ data: { workshopId } }).then((rows) => {
      setEnrollees(rows)
      setLoading(false)
    })
  })

  return (
    <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Enrolled participants</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{topic}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-neutral-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !enrollees || enrollees.length === 0 ? (
            <p className="text-sm text-neutral-400 italic text-center mt-8">No enrollments yet.</p>
          ) : (
            <ul className="space-y-2">
              {enrollees.map((e) => (
                <li key={e.userId} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-teal-700">{e.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{e.name}</p>
                    <p className="text-xs text-neutral-400 truncate">{e.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {enrollees && enrollees.length > 0 && (
          <div className="px-5 py-3 border-t border-neutral-100 text-xs text-neutral-400">
            {enrollees.length} participant{enrollees.length !== 1 ? 's' : ''} enrolled
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Feedback panel (slide-in, anonymized) ────────────────────────────────────

function FeedbackPanel({ workshopId, topic, onClose }: {
  workshopId: string
  topic: string
  onClose: () => void
}) {
  const [data, setData] = useState<{ rows: FeedbackRow[]; avgRating: number | null; counts: number[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    getFeedbackForSession({ data: { workshopId } }).then((d) => {
      setData(d)
      setLoading(false)
    })
  })

  return (
    <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Session feedback</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{topic}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-neutral-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !data || data.rows.length === 0 ? (
            <p className="text-sm text-neutral-400 italic text-center mt-8">No feedback yet.</p>
          ) : (
            <div className="space-y-5">
              {/* Summary */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl font-black text-neutral-900">{data.avgRating?.toFixed(1)}</span>
                  <div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className={`text-base ${s <= Math.round(data.avgRating ?? 0) ? 'text-amber-400' : 'text-neutral-300'}`}>★</span>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">{data.rows.length} response{data.rows.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {/* Star distribution bars */}
                <div className="space-y-1">
                  {[5,4,3,2,1].map((star) => {
                    const c = data.counts[star - 1]
                    const pct = data.rows.length > 0 ? (c / data.rows.length) * 100 : 0
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="text-neutral-500 w-3 text-right">{star}</span>
                        <span className="text-amber-400 text-xs">★</span>
                        <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-neutral-400 w-4 text-right">{c}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Individual comments */}
              {data.rows.filter((r) => r.comment).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Comments</p>
                  <ul className="space-y-2">
                    {data.rows.filter((r) => r.comment).map((r, i) => (
                      <li key={i} className="bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5">
                        <div className="flex gap-0.5 mb-1">
                          {[1,2,3,4,5].map((s) => (
                            <span key={s} className={`text-xs ${s <= r.rating ? 'text-amber-400' : 'text-neutral-300'}`}>★</span>
                          ))}
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed">{r.comment}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        {data && data.rows.length > 0 && (
          <div className="px-5 py-3 border-t border-neutral-100 text-xs text-neutral-400">
            {data.rows.length} response{data.rows.length !== 1 ? 's' : ''} — anonymized
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Workshop session modal (create + edit) ───────────────────────────────────

function SessionModal({ sessionId, onClose, onDone }: {
  sessionId: string | null  // null = create mode, string = edit mode
  onClose: () => void
  onDone: () => void
}) {
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(!!sessionId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ dayId: 'day1', time: '09:00', group: 'A', topic: '', location: '', maxParticipants: 30 })

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  useState(() => {
    if (!sessionId) return
    getSessionForEdit({ data: { id: sessionId } }).then((s) => {
      const dashIdx = s.slotId.indexOf('-')
      const dayId = dashIdx !== -1 ? s.slotId.slice(0, dashIdx) : 'day1'
      const rawTime = s.slotId.slice(dashIdx + 1)
      const LEGACY: Record<string, string> = { morning: '09:00', afternoon: '13:00', evening: '18:00' }
      const time = rawTime in LEGACY ? LEGACY[rawTime]
        : (rawTime.length === 4 && /^\d{4}$/.test(rawTime)) ? `${rawTime.slice(0, 2)}:${rawTime.slice(2)}`
        : rawTime
      setForm({ dayId, time, group: s.group, topic: s.topic, location: s.location ?? '', maxParticipants: s.maxParticipants })
      setLoading(false)
    })
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic.trim()) { setError('Topic is required'); return }
    if (!form.time.trim()) { setError('Time is required'); return }
    if (form.maxParticipants < 1) { setError('Max participants must be at least 1'); return }
    const slotId = `${form.dayId}-${form.time.replace(':', '')}`
    setError(null); setSaving(true)
    startTransition(async () => {
      try {
        if (sessionId) {
          await updateSession({ data: { id: sessionId, slotId, group: form.group, topic: form.topic, location: form.location, maxParticipants: form.maxParticipants } })
        } else {
          await createSession({ data: { slotId, group: form.group, topic: form.topic, location: form.location, maxParticipants: form.maxParticipants } })
        }
        onDone()
      } catch (err: any) { setError(err?.message ?? 'Failed to save'); setSaving(false) }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">{sessionId ? 'Edit' : 'New'} Workshop Session</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="px-6 py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Day</label>
                <select value={form.dayId} onChange={(e) => set('dayId', e.target.value)} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {DAYS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Time <span className="text-red-500">*</span></label>
                <input type="text" value={form.time} onChange={(e) => set('time', e.target.value)} placeholder="09:00" autoFocus className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Group</label>
                <select value={form.group} onChange={(e) => set('group', e.target.value)} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {GROUPS.map((g) => <option key={g} value={g}>Group {g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Topic <span className="text-red-500">*</span></label>
              <input type="text" value={form.topic} onChange={(e) => set('topic', e.target.value)} placeholder="e.g. Sales IT" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Location</label>
              <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Room A" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Max participants</label>
              <input type="number" min={1} max={1000} value={form.maxParticipants} onChange={(e) => set('maxParticipants', Number(e.target.value))} className="w-28 border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="text-xs text-neutral-400">
              Slot ID: <code className="font-mono">{form.dayId}-{form.time.replace(':', '')}</code>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="h-9 px-4 text-sm font-medium text-neutral-600 hover:text-neutral-900">Cancel</button>
              <button type="submit" disabled={saving} className="h-9 px-5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Saving…' : sessionId ? 'Save changes' : 'Create session'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
// ─── Agenda slot modal (create / edit) ────────────────────────────────────────

function AgendaSlotModal({ defaultDayId, existing, onClose, onSaved }: {
  defaultDayId: string
  existing: AgendaSlotRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    dayId: existing?.dayId ?? defaultDayId,
    time: existing?.time ?? '',
    title: existing?.title ?? '',
    type: existing?.type ?? 'break',
    note: existing?.note ?? '',
    location: existing?.location ?? '',
    sortOrder: existing?.sortOrder ?? 50,
  })

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.time.trim()) { setError('Time is required'); return }
    setError(null); setSaving(true)
    startTransition(async () => {
      try {
        if (existing) {
          await updateAgendaSlot({ data: { id: existing.id, ...form } })
        } else {
          await createAgendaSlot({ data: { ...form } })
        }
        onSaved()
      } catch (err: any) { setError(err?.message ?? 'Failed to save'); setSaving(false) }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">{existing ? 'Edit' : 'New'} Agenda Item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Day</label>
              <select value={form.dayId} onChange={(e) => set('dayId', e.target.value)} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {DAYS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Type</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {SLOT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Time <span className="text-red-500">*</span></label>
              <input type="text" value={form.time} onChange={(e) => set('time', e.target.value)} placeholder="12:00" autoFocus className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-neutral-600 mb-1">Title <span className="text-red-500">*</span></label>
              <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Lunch Break" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Note</label>
            <input type="text" value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. All groups" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Location</label>
              <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Main Hall" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Sort order</label>
              <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 text-sm font-medium text-neutral-600 hover:text-neutral-900">Cancel</button>
            <button type="submit" disabled={saving} className="h-9 px-5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Create item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Workshop session card ────────────────────────────────────────────────────

function WorkshopCard({ s, onDelete, onEdit, onViewEnrollees, onViewFeedback }: {
  s: WorkshopSessionRow
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onViewEnrollees: (ws: WorkshopSessionRow) => void
  onViewFeedback: (ws: WorkshopSessionRow) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [, startTransition] = useTransition()

  function handleDelete() {
    setDeleting(true)
    startTransition(async () => {
      await onDelete(s.id)
    })
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GROUP_COLORS[s.group] ?? 'bg-neutral-100 text-neutral-700'}`}>
          Group {s.group}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(s.id)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                {deleting ? '…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-700 rounded hover:bg-neutral-200">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600" title="Delete">
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

      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100 pt-2">
          <button
            onClick={() => onViewEnrollees(s)}
            className="flex items-center gap-1 hover:text-teal-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {s.enrollmentCount} / {s.maxParticipants} enrolled
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewFeedback(s)}
              className="flex items-center gap-1 hover:text-amber-600 transition-colors"
              title="View feedback"
            >
              <span className="text-amber-400">★</span>
              Feedback
            </button>
            <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(100, (s.enrollmentCount / s.maxParticipants) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Agenda item row ──────────────────────────────────────────────────────────

function AgendaItemRow({ slot, onEdit, onDelete }: {
  slot: AgendaSlotRow
  onEdit: (slot: AgendaSlotRow) => void
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [, startTransition] = useTransition()

  function handleDelete() {
    setDeleting(true)
    startTransition(async () => { await onDelete(slot.id) })
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-lg px-4 py-3 shadow-sm">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${TYPE_PILL[slot.type] ?? 'bg-neutral-100 text-neutral-600'}`}>
        {slot.type}
      </span>
      <span className="text-xs text-neutral-400 shrink-0 w-14">{slot.time}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-neutral-900">{slot.title}</span>
        {slot.note && <span className="text-xs text-neutral-400 ml-2">{slot.note}</span>}
        {slot.location && <span className="text-xs text-neutral-400 ml-2">· {slot.location}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(slot)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
              {deleting ? '…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-700 rounded hover:bg-neutral-200">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main admin page ──────────────────────────────────────────────────────────

function AdminLayout() {
  const { sessions, agendaSlots } = Route.useLoaderData()
  const router = useRouter()

  const [sessionModal, setSessionModal] = useState<{ sessionId: string | null } | null>(null)
  const [agendaModal, setAgendaModal] = useState<{ dayId: string; existing: AgendaSlotRow | null } | null>(null)
  const [enrolleePanel, setEnrolleePanel] = useState<WorkshopSessionRow | null>(null)
  const [feedbackPanel, setFeedbackPanel] = useState<WorkshopSessionRow | null>(null)

  function invalidate() { router.invalidate() }

  async function handleDeleteSession(id: string) {
    await deleteSession({ data: { id } })
    invalidate()
  }

  async function handleDeleteAgendaSlot(id: string) {
    await deleteAgendaSlot({ data: { id } })
    invalidate()
  }

  // Group sessions by slotId, then by dayId
  // slotId format: {dayId}-{hhmm}, e.g. "day1-0900"
  const sessionsBySlot = sessions.reduce<Record<string, WorkshopSessionRow[]>>((acc, s) => {
    ;(acc[s.slotId] ??= []).push(s)
    return acc
  }, {})

  // Build slot metadata from existing sessions (plus defaults if no sessions yet)
  // Each slot: { id, dayId, time, label }
  const LEGACY_SLOT_TIMES: Record<string, string> = { morning: '09:00', afternoon: '13:00', evening: '18:00' }
  function parseSlotTime(slotId: string): string {
    const dashIdx = slotId.indexOf('-')
    if (dashIdx === -1) return '00:00'
    const raw = slotId.slice(dashIdx + 1)
    if (raw in LEGACY_SLOT_TIMES) return LEGACY_SLOT_TIMES[raw]
    if (raw.length === 4 && /^\d{4}$/.test(raw)) return `${raw.slice(0, 2)}:${raw.slice(2)}`
    return raw
  }

  const slotMeta: Record<string, { id: string; dayId: string; time: string }> = {}
  for (const s of sessions) {
    if (!slotMeta[s.slotId]) {
      const dashIdx = s.slotId.indexOf('-')
      const dayId = dashIdx !== -1 ? s.slotId.slice(0, dashIdx) : s.slotId
      const time = parseSlotTime(s.slotId)
      slotMeta[s.slotId] = { id: s.slotId, dayId, time }
    }
  }

  const agendaByDay = agendaSlots.reduce<Record<string, AgendaSlotRow[]>>((acc, s) => {
    ;(acc[s.dayId] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Modals */}
      {sessionModal && (
        <SessionModal
          sessionId={sessionModal.sessionId}
          onClose={() => setSessionModal(null)}
          onDone={() => { setSessionModal(null); invalidate() }}
        />
      )}
      {agendaModal && (
        <AgendaSlotModal
          defaultDayId={agendaModal.dayId}
          existing={agendaModal.existing}
          onClose={() => setAgendaModal(null)}
          onSaved={() => { setAgendaModal(null); invalidate() }}
        />
      )}
      {enrolleePanel && (
        <EnrolleePanel
          workshopId={enrolleePanel.id}
          topic={enrolleePanel.topic}
          onClose={() => setEnrolleePanel(null)}
        />
      )}
      {feedbackPanel && (
        <FeedbackPanel
          workshopId={feedbackPanel.id}
          topic={feedbackPanel.topic}
          onClose={() => setFeedbackPanel(null)}
        />
      )}

      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors">← Schedule</Link>
            <span className="text-neutral-300">|</span>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">Admin — Event Schedule</h1>
              <p className="text-xs text-neutral-500">Group IT Conference 2026</p>
            </div>
          </div>
          <BetterAuthHeader />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />

        <div className="space-y-12">
          {DAYS.map((day) => {
            // Workshop slots for this day, sorted by time
            const daySlots = Object.values(slotMeta)
              .filter((s) => s.dayId === day.id)
              .sort((a, b) => a.time.localeCompare(b.time))
            const dayAgendaSlots = agendaByDay[day.id] ?? []

            return (
              <section key={day.id}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">{day.label}</div>
                  <h2 className="text-lg font-semibold text-neutral-800">{day.date}</h2>
                  <button
                    onClick={() => setSessionModal({ sessionId: null })}
                    className="flex items-center gap-1 h-6 px-2 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-full transition-colors ml-auto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add session
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Workshop slots — dynamic from DB */}
                  {daySlots.length === 0 ? (
                    <p className="text-sm text-neutral-400 italic pl-16">No workshop sessions yet — add one above.</p>
                  ) : (
                    daySlots.map((slot) => {
                      const slotSessions = sessionsBySlot[slot.id] ?? []
                      return (
                        <div key={slot.id}>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs text-neutral-400 font-mono w-12 shrink-0">{slot.time}</span>
                            <h3 className="text-sm font-semibold text-neutral-700">Workshop Sessions</h3>
                          </div>
                          <div className="pl-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {slotSessions.map((s) => (
                              <WorkshopCard
                                key={s.id}
                                s={s}
                                onDelete={handleDeleteSession}
                                onEdit={(id) => setSessionModal({ sessionId: id })}
                                onViewEnrollees={setEnrolleePanel}
                                onViewFeedback={setFeedbackPanel}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })
                  )}

                  {/* Agenda items */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs text-neutral-400 font-mono w-12 shrink-0" />
                      <h3 className="text-sm font-semibold text-neutral-700">Other agenda items</h3>
                      <button
                        onClick={() => setAgendaModal({ dayId: day.id, existing: null })}
                        className="flex items-center gap-1 h-6 px-2 text-xs font-medium bg-neutral-600 hover:bg-neutral-700 text-white rounded-full transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                      </button>
                    </div>
                    {dayAgendaSlots.length === 0 ? (
                      <p className="text-sm text-neutral-400 italic pl-16">No agenda items yet.</p>
                    ) : (
                      <div className="pl-16 space-y-2">
                        {dayAgendaSlots.map((slot) => (
                          <AgendaItemRow
                            key={slot.id}
                            slot={slot}
                            onEdit={(s) => setAgendaModal({ dayId: day.id, existing: s })}
                            onDelete={handleDeleteAgendaSlot}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
