'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getApiErrorMessage } from '@/lib/api'
import { normalizeEmail, sanitizeName, validateEmail, validatePassword } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import GoogleAuthButton from '@/components/auth/GoogleAuthButton'
import Logo from '../../public/logo1.png'
import Image from 'next/image'

interface Props {
  mode: 'login' | 'register'
  googleClientId: string
}

export default function AuthPage({ mode, googleClientId }: Props) {
  const router = useRouter()
  const { jwt, setJwt, setUser } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (jwt) router.push('/')
  }, [jwt, router])

  const normalizedEmail = normalizeEmail(email)
  const emailError = validateEmail(normalizedEmail)
  const passwordError = validatePassword(password)
  const nameValue = sanitizeName(name)
  const passwordsMatch = mode === 'register' ? password === confirmPassword : true
  const canSubmit = !emailError && !passwordError && passwordsMatch && (mode === 'login' ? true : Boolean(nameValue))

  async function handleSubmit() {
    setError(null)
    setSuccess(null)

    if (!canSubmit) {
      setError(mode === 'register'
        ? 'Check your email, name, password, and confirmation.'
        : 'Check your email and password.')
      return
    }

    if (mode === 'register' && !passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        name: mode === 'register' ? nameValue : undefined,
      }),
    })
    setLoading(false)

    const data = await response.json().catch(() => ({})) as { token?: string; error?: string }

    if (response.ok && data.token) {
      setJwt(data.token)
      if ('user' in data && data.user && typeof data.user === 'object') {
        setUser(data.user as { id?: string; email?: string; name?: string | null })
      }
      setSuccess(mode === 'register' ? 'Account created successfully.' : 'Signed in successfully.')
      router.push('/')
      return
    }

    setError(data.error ?? getApiErrorMessage({}, mode === 'register' ? 'Could not create account.' : 'Incorrect email or password.'))
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Image src={Logo} alt="OpenSignal Logo" width={44} height={44} />
              <div>
                <p className="text-sm text-gray-400">OpenSignal</p>
                <h1 className="text-2xl font-semibold">{mode === 'register' ? 'Create your account' : 'Welcome back'}</h1>
              </div>
            </div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              {mode === 'register' ? 'Start with email or Google.' : 'Sign in with email or Google.'}
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
              {mode === 'register'
                ? 'Create an account to manage sponsored transactions, wallets, and app access.'
                : 'Use your email password or a trusted Google account to continue.'}
            </p>
            <div className="mt-8 space-y-3 text-sm text-gray-300">
              <p>• Passwords are hashed before storage.</p>
              <p>• Inputs are trimmed and validated on both client and server.</p>
              <p>• Google sign-in uses the Google client ID and server-side token verification.</p>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-gray-800 bg-black p-4">
              <p className="text-gray-500">Security</p>
              <p className="mt-1 font-semibold text-white">Email + Google</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-black p-4">
              <p className="text-gray-500">Storage</p>
              <p className="mt-1 font-semibold text-white">Prisma + Postgres</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-800 bg-black p-8 lg:p-10">
          <div className="space-y-4">
            <GoogleAuthButton clientId={googleClientId} mode={mode} />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-800" />
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">or</span>
              <div className="h-px flex-1 bg-gray-800" />
            </div>

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {mode === 'register' && (
              <Input
                label="Display name"
                autoComplete="name"
                maxLength={80}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <Input
              label="Password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={8}
              maxLength={128}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {mode === 'register' && (
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}

            {mode === 'register' && !passwordsMatch && password && confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match.</p>
            )}

            {email && emailError && <p className="text-xs text-red-400">{emailError}</p>}
            {password && passwordError && <p className="text-xs text-red-400">{passwordError}</p>}

            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              className="w-full py-3!"
            >
              {loading ? (mode === 'register' ? 'Creating account...' : 'Signing in...') : (mode === 'register' ? 'Create account' : 'Sign in')}
            </Button>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">{success}</p>}

            <p className="text-sm text-gray-400">
              {mode === 'register' ? 'Already have an account?' : 'Need an account?'}{' '}
              <button
                type="button"
                onClick={() => router.push(mode === 'register' ? '/login' : '/register')}
                className="text-white underline underline-offset-4"
              >
                {mode === 'register' ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
