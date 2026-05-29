'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getApiErrorMessage } from '@/lib/api'
import Button from '@/components/ui/Button'

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void
          prompt: () => void
        }
      }
    }
  }
}

interface Props {
  clientId: string
  mode: 'login' | 'register'
}

export default function GoogleAuthButton({ clientId, mode }: Props) {
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setJwt } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!clientId) return

    const setupGoogle = () => {
      const google = window.google?.accounts?.id
      if (!google) return

      google.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          if (!credential) return
          setLoading(true)
          setError(null)

          try {
            const response = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential }),
            })

            const data = await response.json().catch(() => ({})) as { token?: string; error?: string }

            if (response.ok && data.token) {
              setJwt(data.token)
              router.push('/')
              return
            }

            setError(data.error ?? 'Google sign-in failed.')
          } catch {
            setError(getApiErrorMessage({}, 'Could not connect to Google sign-in. Please try again.'))
          } finally {
            setLoading(false)
          }
        },
      })

      setReady(true)
    }

    const existingScript = document.getElementById('google-identity-script')
    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'google-identity-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = setupGoogle
      document.head.appendChild(script)
      return
    }

    if (window.google?.accounts?.id) {
      setupGoogle()
      return
    }

    existingScript.addEventListener('load', setupGoogle, { once: true })
  }, [clientId, router, setJwt])

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="default"
        onClick={() => window.google?.accounts?.id?.prompt()}
        disabled={!ready || loading || !clientId}
        className="w-full !py-3"
      >
        {loading ? 'Connecting...' : 'Continue with Google'}
      </Button>
      {loading && <p className="text-xs text-gray-400">Verifying Google account...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!clientId && (
        <p className="text-xs text-gray-500">Google sign-in is not configured for this environment.</p>
      )}
    </div>
  )
}
