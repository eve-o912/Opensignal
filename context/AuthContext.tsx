'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { DEFAULT_BASE, getBase, apiCall } from '@/lib/api'

interface AuthCtx {
  jwt: string | null
  setJwt: (t: string | null) => void
  baseUrl: string
  setBaseUrl: (u: string) => void
  walletAddress: string | null
}

const AuthContext = createContext<AuthCtx>({
  jwt: null,
  setJwt: () => {},
  baseUrl: DEFAULT_BASE,
  setBaseUrl: () => {},
  walletAddress: null,
})

const INACTIVITY_TIMEOUT = 30 * 60 * 1000

/** Decode a JWT and return its payload, or null if malformed. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const padded = part
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(part.length / 4) * 4, '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Try to extract a Sui wallet address from common JWT claim names. */
function walletAddressFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  const candidates = [
    payload.email,          // this backend stores the Sui address in the email field
    payload.walletAddress,
    payload.wallet_address,
    payload.address,
    payload.suiAddress,
    payload.sui_address,
    payload.sub,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && /^0x[a-fA-F0-9]{63,64}$/.test(c)) return c
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwt, setJwt] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  const resetInactivityTimer = () => {
    if (!jwt) return
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = setTimeout(() => {
      console.log('Signing out due to inactivity')
      setJwt(null)
    }, INACTIVITY_TIMEOUT)
  }

  // Restore jwt and baseUrl from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('os_jwt')
    if (token) setJwt(token)
    setBaseUrl(getBase())
  }, [])

  // Whenever jwt changes, resolve the wallet address:
  // 1. Try to decode it from the JWT payload directly
  // 2. Fall back to GET /v1/portal/auth/me
  useEffect(() => {
    if (!jwt) {
      setWalletAddress(null)
      return
    }

    // 1. Fast path — read from JWT claim
    const fromJwt = walletAddressFromJwt(jwt)
    if (fromJwt) {
      setWalletAddress(fromJwt)
      return
    }

    // 2. Slow path — ask the server
    async function fetchMe() {
      const paths = [
        '/v1/portal/auth/me',
        '/v1/portal/me',
        '/v1/auth/me',
        '/me',
      ]
      for (const path of paths) {
        const r = await apiCall<Record<string, unknown>>('GET', path, undefined, jwt)
        if (!r.ok) continue

        const data = r.data
        const candidates = [
          data.walletAddress,
          data.wallet_address,
          data.address,
          data.suiAddress,
          data.sui_address,
          (data.user as Record<string, unknown> | undefined)?.walletAddress,
          (data.user as Record<string, unknown> | undefined)?.wallet_address,
          (data.user as Record<string, unknown> | undefined)?.address,
        ]
        for (const c of candidates) {
          if (typeof c === 'string' && /^0x[a-fA-F0-9]{63,64}$/.test(c)) {
            setWalletAddress(c)
            return
          }
        }
        // Found the endpoint but no address field — stop trying
        break
      }
    }

    fetchMe()
  }, [jwt])

  // Inactivity timer
  useEffect(() => {
    if (!jwt) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
      return
    }

    resetInactivityTimer()

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    const handleActivity = () => resetInactivityTimer()
    activityEvents.forEach((e) => window.addEventListener(e, handleActivity))

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      activityEvents.forEach((e) => window.removeEventListener(e, handleActivity))
    }
  }, [jwt])

  // Persist jwt to localStorage
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
    <AuthContext.Provider value={{ jwt, setJwt, baseUrl, setBaseUrl: handleSetBaseUrl, walletAddress }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)