'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { apiCall, getApiErrorMessage } from '@/lib/api'
import {
  getInjectedWalletNames,
  waitForInjectedWalletProviders,
  connectWalletAndGetAddress,
  getWalletMessageSigner,
} from '@/lib/wallet'
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

  const [walletLoading, setWalletLoading] = useState(false)
  const [walletState, setWalletState] = useState<{ ok: boolean; msg: string } | null>(null)
  const [walletNames, setWalletNames] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    const refreshWallets = () => {
      if (cancelled) return
      setWalletNames(getInjectedWalletNames())
    }

    refreshWallets()
    const intervalId = window.setInterval(refreshWallets, 1000)
    window.addEventListener('focus', refreshWallets)
    document.addEventListener('visibilitychange', refreshWallets)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshWallets)
      document.removeEventListener('visibilitychange', refreshWallets)
    }
  }, [])

  const walletDetected = walletNames.length > 0

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

    async function doWalletLogin() {
    setWalletLoading(true)
    setWalletState(null)

    try {
      const providers = await waitForInjectedWalletProviders()
      if (!providers.length) {
        throw new Error('No Sui wallet detected. Install Slush, refresh the page, and allow the extension on this site.')
      }

      const provider = providers[0]
      const accountAddress = await connectWalletAndGetAddress(provider)

      if (!/^0x[a-fA-F0-9]{63,64}$/.test(accountAddress)) {
        throw new Error('Invalid wallet address format received from wallet.')
      }

      const nonce = Date.now().toString()
      const message = `Sign in to OpenSignal\nAddress: ${accountAddress}\nNonce: ${nonce}`

      const signMessage = getWalletMessageSigner(provider)
      if (!signMessage) {
        throw new Error('This wallet does not support message signing.')
      }

      const signatureResult = await signMessage({
        message,
        account: provider.accounts?.[0] ?? { address: accountAddress },
        chain: 'sui:testnet',
      })

      const signature = signatureResult?.signature
      if (!signature) {
        throw new Error('Wallet did not return a signature. Please try again.')
      }

      const r = await apiCall<{ token?: string }>('POST', '/v1/portal/auth/wallet-login', {
        walletAddress: accountAddress,
        message,
        signature,
        nonce,
      })

      setWalletLoading(false)
      if (r.ok && r.data.token) {
        setJwt(r.data.token)
        const short = `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
        const providerName = provider.name?.trim() || 'Sui wallet'
        setWalletState({ ok: true, msg: `Signed in with ${providerName} (${short})` })
        show('Wallet authentication successful')
        onNavigate?.('apps')
      } else {
        setWalletState({ ok: false, msg: getApiErrorMessage(r.data, 'Wallet authentication failed.') })
      }
    } catch (error) {
      setWalletLoading(false)
      setWalletState({ ok: false, msg: error instanceof Error ? error.message : 'Wallet sign-in failed.' })
      console.error('Wallet login error:', error)
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

      {!jwt && (
        <FormPanel step={0} title="Quick sign-in with Sui wallet" desc="Connect your Sui wallet and sign a message to log in instantly.">
          {walletDetected && walletNames.length > 0 && (
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Detected wallet{walletNames.length > 1 ? 's' : ''}: {walletNames.join(', ')}
            </div>
          )}
          {!walletDetected && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No wallet was detected yet. If Slush is installed, refresh the page and allow the extension on this site.
            </div>
          )}
          <Button variant="primary" onClick={doWalletLogin} disabled={walletLoading}>
            {walletLoading ? 'Connecting…' : '🔐 Connect Sui Wallet'}
          </Button>
          {walletLoading && <Spinner label="Connecting wallet…" />}
          {walletState && <ResponseBox ok={walletState.ok} friendly={walletState.msg} />}
        </FormPanel>
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
