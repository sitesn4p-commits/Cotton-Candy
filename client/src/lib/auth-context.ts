import { createContext } from 'react'
import type { AuthResponse, AuthUser } from './api'

export type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  signInAsAdmin: (email: string, password: string) => Promise<AuthResponse>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
