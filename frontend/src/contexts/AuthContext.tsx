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
  /** Saransh backend session JWT (for /api/* calls), or null. */
  apiToken: string | null
  /** fetch() wrapper that targets the backend and adds the Bearer token. */
  authFetch: (path: string, init?: RequestInit) => Promise<Response>
}

const BACKEND_URL = 'http://localhost:5167'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiToken, setApiToken] = useState<string | null>(null)

  // Restore any existing valid session on startup.
  useEffect(() => {
    let active = true
    Promise.all([
      invoke<AuthSession | null>('auth_get_session').catch(() => null),
      invoke<boolean>('auth_is_configured').catch(() => false),
      invoke<string | null>('auth_get_api_token').catch(() => null),
    ]).then(([s, configured, token]) => {
      if (!active) return
      setSession(s ?? null)
      setIsConfigured(Boolean(configured))
      setApiToken(token ?? null)
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
      const token = await invoke<string | null>('auth_get_api_token').catch(() => null)
      setApiToken(token ?? null)
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
    setApiToken(null)
  }, [])

  // fetch() wrapper: prefixes the backend URL and attaches the Bearer token.
  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      // Prefer live token; fall back to a fresh lookup if state hasn't caught up.
      const token = apiToken ?? (await invoke<string | null>('auth_get_api_token').catch(() => null))
      if (token) headers.set('Authorization', `Bearer ${token}`)
      const url = path.startsWith('http') ? path : `${BACKEND_URL}${path}`
      return fetch(url, { ...init, headers })
    },
    [apiToken],
  )

  return (
    <AuthContext.Provider
      value={{ session, loading, isConfigured, loggingIn, error, login, logout, apiToken, authFetch }}
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
