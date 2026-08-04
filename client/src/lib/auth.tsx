import { useMemo, useState, type ReactNode } from 'react'
import { api, type AuthResponse } from './api'
import { AuthContext, type AuthContextValue } from './auth-context'
const sessionKey = 'cotton-candy-session-v1'

function readStoredSession(): AuthResponse | null {
  try {
    const value = localStorage.getItem(sessionKey)
    return value ? JSON.parse(value) as AuthResponse : null
  } catch {
    localStorage.removeItem(sessionKey)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(readStoredSession)
  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    signInAsAdmin: async (email, password) => {
      const nextSession = await api.signInAsAdmin(email, password)
      localStorage.setItem(sessionKey, JSON.stringify(nextSession))
      setSession(nextSession)
      return nextSession
    },
    signOut: () => {
      localStorage.removeItem(sessionKey)
      setSession(null)
    },
  }), [session])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
