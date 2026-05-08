'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { DEFAULT_BASE, getBase } from '@/lib/api'

interface AuthCtx {
  jwt: string | null
  setJwt: (t: string | null) => void
  baseUrl: string
  setBaseUrl: (u: string) => void
}

const AuthContext = createContext<AuthCtx>({
  jwt: null,
  setJwt: () => {},
  baseUrl: DEFAULT_BASE,
  setBaseUrl: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwt, setJwt] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE)

  useEffect(() => {
    const token = localStorage.getItem('os_jwt')
    if (token) setJwt(token)
    // Use the same resolution logic as api.ts to stay in sync
    setBaseUrl(getBase())
  }, [])

  useEffect(() => {
    if (jwt) {
      localStorage.setItem('os_jwt', jwt)
    } else {
      localStorage.removeItem('os_jwt')
    }
  }, [jwt])

  function handleSetBaseUrl(u: string) {
    const normalized = u.trim().replace(/\/$/, '')
    localStorage.setItem('os_base_url', normalized)
    setBaseUrl(normalized)
  }

  return (
    <AuthContext.Provider value={{ jwt, setJwt, baseUrl, setBaseUrl: handleSetBaseUrl }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)