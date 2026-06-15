'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginScreen } from './LoginScreen'

/**
 * Mandatory auth gate. Renders the login screen until a valid @intelligaia.com
 * session exists; otherwise renders the app (onboarding / main UI).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return <>{children}</>
}
