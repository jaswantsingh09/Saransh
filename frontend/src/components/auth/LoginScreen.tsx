'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

export function LoginScreen() {
  const { login, loggingIn, error, isConfigured } = useAuth()

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900">Sign in to Saransh</h1>
        <p className="mt-2 text-sm text-gray-500">
          Access is restricted to{' '}
          <span className="font-medium text-gray-700">@intelligaia.com</span> Google
          accounts.
        </p>

        {!isConfigured ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
            Google sign-in isn’t configured. Set{' '}
            <code className="rounded bg-amber-100 px-1">GOOGLE_OAUTH_CLIENT_ID</code> and{' '}
            <code className="rounded bg-amber-100 px-1">GOOGLE_OAUTH_CLIENT_SECRET</code>{' '}
            before launching the app.
          </div>
        ) : (
          <>
            <Button
              onClick={login}
              disabled={loggingIn}
              size="lg"
              className="mt-6 w-full"
            >
              {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              {loggingIn ? 'Waiting for browser…' : 'Sign in with Google'}
            </Button>

            {loggingIn && (
              <p className="mt-3 text-xs text-gray-400">
                Complete sign-in in the browser window that just opened, then return
                here.
              </p>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
