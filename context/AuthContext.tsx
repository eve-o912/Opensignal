'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface AuthUser {
  id?: string
  email?: string
  name?: string | null
  walletAddress?: string | null
}

function resolveDefaultBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE
  if (configured) return configured.replace(/\/$/, '')

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:10000'
  }

  return 'https://opensignal-gas-station.onrender.com'
}

const DEFAULT_BASE_URL = resolveDefaultBaseUrl()

interface AuthCtx {
  jwt: string | null
  setJwt: (t: string | null) => void
  user: AuthUser | null
  setUser: (u: AuthUser | null) => void
  walletAddress: string | null
  baseUrl: string
  setBaseUrl: (u: string) => void
}

const AuthContext = createContext<AuthCtx>({
  jwt: null,
  setJwt: () => {},
  user: null,
  setUser: () => {},
  walletAddress: null,
  baseUrl: DEFAULT_BASE_URL,
  setBaseUrl: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwt, setJwt] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL)

  useEffect(() => {
    const token = localStorage.getItem('os_jwt')
    const stored = localStorage.getItem('os_base_url')
    const storedUser = localStorage.getItem('os_user')
    if (token) setJwt(token)
    if (stored) setBaseUrl(stored.replace(/\/$/, ''))
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser)
      } catch {
        localStorage.removeItem('os_user')
      }
    }
  }, [])

  useEffect(() => {
    if (jwt) {
      localStorage.setItem('os_jwt', jwt)
    } else {
      localStorage.removeItem('os_jwt')
    }
  }, [jwt])

  useEffect(() => {
    if (user) {
      localStorage.setItem('os_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('os_user')
    }
  }, [user])

  useEffect(() => {
    localStorage.setItem('os_base_url', baseUrl.replace(/\/$/, ''))
  }, [baseUrl])

  return (
    <AuthContext.Provider
      value={{
        jwt,
        setJwt,
        user,
        setUser,
        walletAddress: user?.walletAddress ?? null,
        baseUrl,
        setBaseUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
