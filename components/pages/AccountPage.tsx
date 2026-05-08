'use client'

import { useEffect, useState } from 'react'
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

interface InjectedWalletProvider {
  name?: string
  features?: Record<string, unknown>
  accounts?: Array<{ address?: string }>
  connect?: (args?: Record<string, unknown>) => Promise<{ accounts?: Array<{ address?: string; chains?: string[] }> }>
  getAccounts?: () => Promise<Array<{ address?: string }>>
  signMessage?: (input: { message: string }) => Promise<{ signature?: string }>
  signTransaction?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
  signTransactionBlock?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
}

function getInjectedWalletProviders(): InjectedWalletProvider[] {
  if (typeof window === 'undefined') return []

  const win = window as Window & {
    getWallets?: () => InjectedWalletProvider[]
    wallets?: InjectedWalletProvider[]
    suiWallet?: InjectedWalletProvider
  }

  if (typeof win.getWallets === 'function') return win.getWallets().filter(Boolean)
  if (Array.isArray(win.wallets)) return win.wallets.filter(Boolean)
  if (win.suiWallet) return [win.suiWallet]
  return []
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
  const [walletDetected, setWalletDetected] = useState(false)

  // Check for wallet on mount
  useEffect(() => {
    const providers = getInjectedWalletProviders()
    setWalletDetected(providers.length > 0)
  }, [])

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
      // Step 1: Detect wallet
      const providers = getInjectedWalletProviders()
      if (!providers.length) {
        throw new Error('No Sui wallet extension detected. Please install Sui Wallet, Movella, or another compatible Sui wallet extension and refresh this page.')
      }

      // Use the first available wallet provider
      const provider = providers[0]
      if (!provider.name) {
        throw new Error('Wallet provider name not available.')
      }

      // Step 2: Connect to wallet
      let accountAddress: string | undefined
      try {
        const connected = await provider.connect?.({})
        accountAddress = connected?.accounts?.[0]?.address
      } catch {
        // Fallback to getAccounts if connect fails
        const accounts = await provider.getAccounts?.()
        accountAddress = accounts?.[0]?.address
      }

      if (!accountAddress) {
        throw new Error('Wallet connection failed. Could not retrieve wallet address. Please try again.')
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{63,64}$/.test(accountAddress)) {
        throw new Error('Invalid wallet address format received from wallet.')
      }

      // Step 3: Create message to sign
      const nonce = Date.now().toString()
      const message = `Sign in to OpenSignal\nAddress: ${accountAddress}\nNonce: ${nonce}`

      // Step 4: Request signature from wallet
      let signature: string | undefined
      try {
        const signatureResult = await provider.signMessage?.({ message })
        signature = signatureResult?.signature
      } catch (error) {
        throw new Error(error instanceof Error ? `Wallet signing failed: ${error.message}` : 'Wallet rejected the signing request. Please try again.')
      }

      if (!signature) {
        throw new Error('Wallet did not return a signature. Please ensure your wallet supports message signing and try again.')
      }

      // Step 5: Verify signature on backend
      const r = await apiCall<{ token?: string; isWalletAuth?: boolean }>('POST', '/v1/portal/auth/wallet-login', {
        walletAddress: accountAddress,
        message,
        signature,
        nonce,
      })

      setWalletLoading(false)
      if (r.ok && r.data.token) {
        setJwt(r.data.token)
        const shortAddress = `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
        setWalletState({ ok: true, msg: `Successfully signed in with wallet ${shortAddress}` })
        show('Wallet authentication successful')
        onNavigate?.('apps')
      } else {
        const errorMsg = getApiErrorMessage(r.data, 'Wallet authentication failed on the backend.')
        setWalletState({ ok: false, msg: errorMsg })
      }
    } catch (error) {
      setWalletLoading(false)
      const errorMsg = error instanceof Error ? error.message : 'Wallet sign-in failed. Please check your connection and try again.'
      setWalletState({ ok: false, msg: errorMsg })
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

      {walletDetected && !jwt && (
        <FormPanel step={0} title="Quick sign-in with Sui wallet" desc="Connect your Sui wallet and sign a message to log in instantly.">
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
