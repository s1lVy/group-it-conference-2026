import { createFileRoute } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/login')({ component: Login })

function Login() {
  const { data: session, isPending } = authClient.useSession()
  const navigate = Route.useNavigate()

  // If already signed in, send to home
  if (!isPending && session?.user) {
    void navigate({ to: '/' })
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Group IT Conference 2026</h1>
          <p className="text-neutral-500 text-sm mt-2">10–11 June 2026</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-8 py-8 flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Sign in to continue</h2>
            <p className="text-sm text-neutral-500">Use your Microsoft account to access the event schedule.</p>
          </div>

          <button
            onClick={() => {
              void authClient.signIn.social({ provider: 'microsoft', callbackURL: '/' })
            }}
            className="w-full h-10 px-4 text-sm font-medium bg-[#0078d4] hover:bg-[#106ebe] text-white transition-colors rounded flex items-center justify-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Sign in with Microsoft
          </button>
        </div>
      </div>
    </div>
  )
}
