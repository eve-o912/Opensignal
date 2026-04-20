'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

function resolveDefaultBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE
  if (configured) return configured.replace(/\/$/, '')

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:10000'
  }

  return 'https://opensignal.onrender.com'
}

const DEFAULT_BASE_URL = resolveDefaultBaseUrl()

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
    const token = localStorage.getItem('os_jwt')
    const stored = localStorage.getItem('os_base_url')
    if (token) setJwt(token)
    if (stored) setBaseUrl(stored.replace(/\/$/, ''))
  }, [])

  useEffect(() => {
    if (jwt) {
      localStorage.setItem('os_jwt', jwt)
    } else {
      localStorage.removeItem('os_jwt')
    }
  }, [jwt])

  useEffect(() => {
    localStorage.setItem('os_base_url', baseUrl.replace(/\/$/, ''))
  }, [baseUrl])

  return (
    <AuthContext.Provider value={{ jwt, setJwt, baseUrl, setBaseUrl }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
