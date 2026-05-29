'use client'

import { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import SectionHeader from '@/components/layout/SectionHeader'

interface AccountPageProps {
  onNavigate?: (page: string) => void
}

export default function AccountPage({ onNavigate }: AccountPageProps) {
  const { jwt, user, setJwt, setUser, baseUrl } = useAuth()

  const tokenPreview = useMemo(() => {
    if (!jwt) return 'No active session'
    if (jwt.length <= 16) return jwt
    return `${jwt.slice(0, 8)}…${jwt.slice(-6)}`
  }, [jwt])

  const initials = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || 'U'
    return source
      .split(/\s+/)
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [user])

  function handleSignOut() {
    setJwt(null)
    setUser(null)
    onNavigate?.('landing')
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Account"
        title="Your details"
        sub="A read-only snapshot of the current signed-in user and session."
      />

      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-500 to-blue-700 text-lg font-semibold text-white">
              {initials}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Profile</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">
                {user?.name || user?.email || 'Signed-in user'}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {user?.email ? 'Email account' : 'No profile data available yet'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-10 items-center justify-center rounded-full border border-gray-700 px-4 text-sm font-medium text-white transition hover:border-gray-500 hover:bg-gray-900"
          >
            Sign out
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Name</p>
            <p className="mt-2 text-sm font-medium text-white">{user?.name || 'Not set'}</p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Email</p>
            <p className="mt-2 break-all text-sm font-medium text-white">{user?.email || 'Not set'}</p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Session</p>
            <p className="mt-2 text-sm font-medium text-white">{jwt ? 'Authenticated' : 'Signed out'}</p>
            <p className="mt-1 text-xs text-gray-500">{tokenPreview}</p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">API base</p>
            <p className="mt-2 break-all text-sm font-medium text-white">{baseUrl}</p>
          </div>
        </div>

        {!jwt && (
          <div className="mt-4 rounded-2xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">
            No active session found. Sign in again to populate your profile details.
          </div>
        )}
      </div>
    </div>
  )
}
