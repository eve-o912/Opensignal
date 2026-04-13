'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface AuthCtx {
  jwt: string | null
  setJwt: (t: string | null) => void
  baseUrl: string
  setBaseUrl: (u: string) => void
}

const AuthContext = createContext<AuthCtx>({
  jwt: null,
  setJwt: () => {},
  baseUrl: 'https://api.opensignal.xyz',
  setBaseUrl: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwt, setJwt] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState('https://api.opensignal.xyz')
  return (
    <AuthContext.Provider value={{ jwt, setJwt, baseUrl, setBaseUrl }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
