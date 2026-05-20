import { createFileRoute } from '@tanstack/react-router'
import BetterAuthHeader from '#/integrations/better-auth/header-user'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Group IT Conference 2026</h1>
        <BetterAuthHeader />
      </div>
      <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
        Sign in with your Microsoft account to continue.
      </p>
    </div>
  )
}
