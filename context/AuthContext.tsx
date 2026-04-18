'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

const DEFAULT_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE ?? 'https://opensignal.onrender.com').replace(/\/$/, '')

interface AuthCtx {
  jwt: string | null
  setJwt: (t: string | null) => void
  baseUrl: string
  setBaseUrl: (u: string) => void
}

const AuthContext = createContext<AuthCtx>({
  jwt: null,
  setJwt: () => {},
  baseUrl: DEFAULT_BASE_URL,
  setBaseUrl: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwt, setJwt] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL)

  useEffect(() => {
    const stored = localStorage.getItem('os_base_url')
    if (stored) setBaseUrl(stored.replace(/\/$/, ''))
  }, [])

  return (
    <AuthContext.Provider value={{ jwt, setJwt, baseUrl, setBaseUrl }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
