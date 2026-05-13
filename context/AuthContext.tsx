'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
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

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwt, setJwt] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Reset inactivity timer on user activity
  const resetInactivityTimer = () => {
    if (!jwt) return

    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    // Set new timer to auto sign out after inactivity
    inactivityTimerRef.current = setTimeout(() => {
      console.log('Signing out due to inactivity')
      setJwt(null)
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    const token = localStorage.getItem('os_jwt')
    if (token) setJwt(token)
    // Use the same resolution logic as api.ts to stay in sync
    setBaseUrl(getBase())
  }, [])

  // Set up inactivity timer and activity listeners
  useEffect(() => {
    if (!jwt) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
      return
    }

    resetInactivityTimer()

    // Activity events to track
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      resetInactivityTimer()
    }

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [jwt])

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