import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { useState, useTransition } from 'react'
import { createSession } from '#/lib/admin'

export const Route = createFileRoute('/admin/sessions/new')({
  component: NewSession,
})

const SLOTS = [
  { id: 'day1-morning', label: 'Day 1 — Morning (Wed 09:00)' },
  { id: 'day1-afternoon', label: 'Day 1 — Afternoon (Wed 13:00)' },
  { id: 'day2-morning', label: 'Day 2 — Morning (Thu 09:00)' },
]

const GROUPS = ['A', 'B', 'C']

function NewSession() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    slotId: 'day1-morning',
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
        router.navigate({ to: '/admin' })
      } catch (err: any) {
        setError(err?.message ?? 'Failed to save')
        setSaving(false)
      }
    })
  }

  return <SessionForm
    title="New Workshop Session"
    form={form}
    set={set}
    onSubmit={handleSubmit}
    error={error}
    saving={saving}
    submitLabel="Create session"
  />
}

export function SessionForm({
  title,
  form,
  set,
  onSubmit,
  error,
  saving,
  submitLabel,
}: {
  title: string
  form: { slotId: string; group: string; topic: string; location: string; maxParticipants: number }
  set: <K extends 'slotId' | 'group' | 'topic' | 'location' | 'maxParticipants'>(k: K, v: any) => void
  onSubmit: (e: React.FormEvent) => void
  error: string | null
  saving: boolean
  submitLabel: string
}) {
  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-sm text-neutral-500 hover:text-neutral-800">← Back</Link>
        <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
      </div>

      <form onSubmit={onSubmit} className="bg-white border border-neutral-200 rounded-xl shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Timeslot</label>
            <select
              value={form.slotId}
              onChange={(e) => set('slotId', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Group</label>
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
          <label className="block text-sm font-medium text-neutral-700 mb-1">Topic</label>
          <input
            type="text"
            value={form.topic}
            onChange={(e) => set('topic', e.target.value)}
            placeholder="e.g. Sales IT"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. Room A"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Max participants</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={form.maxParticipants}
            onChange={(e) => set('maxParticipants', Number(e.target.value))}
            className="w-32 border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : submitLabel}
          </button>
          <Link to="/admin" className="h-9 px-4 text-sm font-medium text-neutral-600 hover:text-neutral-900 flex items-center">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
