'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { apiCall, getApiErrorMessage } from '@/lib/api'
import SectionHeader from '@/components/layout/SectionHeader'
import FormPanel from '@/components/layout/FormPanel'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ResponseBox from '@/components/ui/ResponseBox'
import Spinner from '@/components/ui/Spinner'

interface AccountPageProps {
  onNavigate?: (page: string) => void
}

export default function AccountPage({ onNavigate }: AccountPageProps) {
  const { jwt, setJwt } = useAuth()
  const { show }   = useToast()

  const [suEmail,   setSuEmail]   = useState('')
  const [suPass,    setSuPass]    = useState('')
  const [suConfirm, setSuConfirm] = useState('')
  const [suState,   setSuState]   = useState<{ ok: boolean; msg: string } | null>(null)
  const [suLoading, setSuLoading] = useState(false)

  const [liEmail,   setLiEmail]   = useState('')
  const [liPass,    setLiPass]    = useState('')
  const [liState,   setLiState]   = useState<{ ok: boolean; msg: string } | null>(null)
  const [liLoading, setLiLoading] = useState(false)

  const normalizedSignupEmail = suEmail.trim().toLowerCase()
  const signupEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedSignupEmail)
  const signupPasswordValid = suPass.length >= 8
  const signupMatches = suPass === suConfirm
  const signupReady = signupEmailValid && signupPasswordValid && signupMatches

  async function doSignup() {
    if (!signupReady) {
      setSuState({ ok: false, msg: 'Use a valid email, password of at least 8 characters, and matching confirmation.' })
      return
    }

    setSuLoading(true); setSuState(null)
    const r = await apiCall<{ token?: string }>('POST', '/v1/portal/auth/signup', {
      email: normalizedSignupEmail,
      password: suPass,
    })
    setSuLoading(false)
    if (r.ok && r.data.token) {
      setJwt(r.data.token)
      setSuState({ ok: true, msg: 'Account created and signed in. You can now create apps and keys.' })
      setLiEmail(normalizedSignupEmail)
      setLiPass('')
      setSuPass('')
      setSuConfirm('')
      show('Welcome to OpenSignal')
      onNavigate?.('apps')
      return
    }

    setSuState(r.ok
      ? { ok: true,  msg: 'Account created! Sign in below to get started.' }
      : { ok: false, msg: getApiErrorMessage(r.data, 'Something went wrong. Please try again.') }
    )
  }

  async function doLogin() {
    setLiLoading(true); setLiState(null)
    const r = await apiCall<{ token?: string }>('POST', '/v1/portal/auth/login', { email: liEmail, password: liPass })
    setLiLoading(false)
    if (r.ok && r.data.token) {
      setJwt(r.data.token)
      setLiState({ ok: true, msg: "You're in! Head to the Dashboard to see your activity." })
      show('Signed in successfully')
    } else {
      setLiState({ ok: false, msg: getApiErrorMessage(r.data, 'Incorrect email or password.') })
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Access"
        title="Your account"
        sub="Create an account or sign in to start sponsoring transactions."
      />

      {jwt && (
        <div className="mb-3 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-3 text-sm text-teal-900">
          Signed in successfully. Continue with app setup from the Apps or Checkout sections.
        </div>
      )}

      <FormPanel step={1} title="Create an account" desc="Just your email and a password. That's it.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Input label="Email address" type="email" placeholder="you@example.com"
            value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
          <Input label="Password" type="password" placeholder="Choose a password"
            value={suPass} onChange={(e) => setSuPass(e.target.value)} />
          <Input label="Confirm password" type="password" placeholder="Repeat your password"
            value={suConfirm} onChange={(e) => setSuConfirm(e.target.value)} />
        </div>
        <Button variant="primary" onClick={doSignup} disabled={suLoading || !signupReady}>
          {suLoading ? 'Creating…' : 'Create account'}
        </Button>
        {suLoading && <Spinner label="Creating your account…" />}
        {suState && <ResponseBox ok={suState.ok} friendly={suState.msg} />}
      </FormPanel>

      <FormPanel step={2} title="Already have an account?" desc="Sign in to unlock your dashboard and API keys.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Input label="Email address" type="email" placeholder="you@example.com"
            value={liEmail} onChange={(e) => setLiEmail(e.target.value)} />
          <Input label="Password" type="password" placeholder="Your password"
            value={liPass} onChange={(e) => setLiPass(e.target.value)} />
        </div>
        <Button variant="primary" onClick={doLogin} disabled={liLoading}>
          {liLoading ? 'Signing in…' : 'Sign in'}
        </Button>
        {liLoading && <Spinner label="Signing you in…" />}
        {liState && <ResponseBox ok={liState.ok} friendly={liState.msg} />}
      </FormPanel>
    </div>
  )
}
