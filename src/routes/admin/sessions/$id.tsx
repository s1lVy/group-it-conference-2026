import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useTransition } from 'react'
import { getSessionForEdit, updateSession } from '#/lib/admin'
import { SessionForm } from './new'

export const Route = createFileRoute('/admin/sessions/$id')({
  loader: ({ params }) => getSessionForEdit({ data: { id: params.id } }),
  component: EditSession,
})

function EditSession() {
  const existing = Route.useLoaderData()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    slotId: existing.slotId,
    group: existing.group,
    topic: existing.topic,
    location: existing.location,
    maxParticipants: existing.maxParticipants,
  })

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic.trim()) { setError('Topic is required'); return }
    if (!form.location.trim()) { setError('Location is required'); return }
    if (form.maxParticipants < 1) { setError('Max participants must be at least 1'); return }
    setError(null)
    setSaving(true)
    startTransition(async () => {
      try {
        await updateSession({ data: { id: existing.id, ...form } })
        router.navigate({ to: '/admin' })
      } catch (err: any) {
        setError(err?.message ?? 'Failed to save')
        setSaving(false)
      }
    })
  }

  return <SessionForm
    title="Edit Workshop Session"
    form={form}
    set={set}
    onSubmit={handleSubmit}
    error={error}
    saving={saving}
    submitLabel="Save changes"
  />
}
