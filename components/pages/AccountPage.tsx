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

export default function AccountPage() {
  const { setJwt } = useAuth()
  const { show }   = useToast()

  const [suEmail,   setSuEmail]   = useState('')
  const [suPass,    setSuPass]    = useState('')
  const [suState,   setSuState]   = useState<{ ok: boolean; msg: string } | null>(null)
  const [suLoading, setSuLoading] = useState(false)

  const [liEmail,   setLiEmail]   = useState('')
  const [liPass,    setLiPass]    = useState('')
  const [liState,   setLiState]   = useState<{ ok: boolean; msg: string } | null>(null)
  const [liLoading, setLiLoading] = useState(false)

  async function doSignup() {
    setSuLoading(true); setSuState(null)
    const r = await apiCall('POST', '/v1/portal/auth/signup', { email: suEmail, password: suPass })
    setSuLoading(false)
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

      <FormPanel step={1} title="Create an account" desc="Just your email and a password. That's it.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Input label="Email address" type="email" placeholder="you@example.com"
            value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
          <Input label="Password" type="password" placeholder="Choose a password"
            value={suPass} onChange={(e) => setSuPass(e.target.value)} />
        </div>
        <Button variant="primary" onClick={doSignup} disabled={suLoading}>
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
