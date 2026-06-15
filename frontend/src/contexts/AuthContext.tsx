'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { invoke } from '@tauri-apps/api/core'

export interface AuthSession {
  email: string
  name: string
  picture: string
  authorized_at: string
  expires_at: string
}

interface AuthContextValue {
  session: AuthSession | null
  loading: boolean
  isConfigured: boolean
  loggingIn: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore any existing valid session on startup.
  useEffect(() => {
    let active = true
    Promise.all([
      invoke<AuthSession | null>('auth_get_session').catch(() => null),
      invoke<boolean>('auth_is_configured').catch(() => false),
    ]).then(([s, configured]) => {
      if (!active) return
      setSession(s ?? null)
      setIsConfigured(Boolean(configured))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async () => {
    setError(null)
    setLoggingIn(true)
    try {
      const s = await invoke<AuthSession>('auth_start_login')
      setSession(s)
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e as Error)?.message ?? 'Sign-in failed'
      setError(msg)
    } finally {
      setLoggingIn(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await invoke('auth_logout')
    } catch {
      /* ignore */
    }
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, loading, isConfigured, loggingIn, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
