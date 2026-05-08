'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { apiCall, getApiErrorMessage } from '@/lib/api'
import {
  waitForInjectedWalletProviders,
  connectWalletAndGetAddress,
  getWalletMessageSigner,
  type InjectedWalletProvider,
} from '@/lib/wallet'
import SectionHeader from '@/components/layout/SectionHeader'
import FormPanel from '@/components/layout/FormPanel'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ResponseBox from '@/components/ui/ResponseBox'
import Spinner from '@/components/ui/Spinner'
import WalletPickerDialog from '@/components/ui/WalletPickerDialog'


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
  const [walletProviders, setWalletProviders] = useState<InjectedWalletProvider[]>([])
  const [walletPickerOpen, setWalletPickerOpen] = useState(false)
  const [selectedWalletIndex, setSelectedWalletIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadWallets() {
      const providers = await waitForInjectedWalletProviders(1000)
      if (cancelled) return
      setWalletProviders(providers)
      setSelectedWalletIndex((current) => Math.min(current, Math.max(providers.length - 1, 0)))
    }

    loadWallets()
    const intervalId = window.setInterval(loadWallets, 1500)
      window.addEventListener('focus', loadWallets)
      document.addEventListener('visibilitychange', loadWallets)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
        window.removeEventListener('focus', loadWallets)
        document.removeEventListener('visibilitychange', loadWallets)
    }
  }, [])

  const walletDetected = walletProviders.length > 0

  async function postWalletLogin(payload: { walletAddress: string; message: string; signature: string; nonce: string }) {
    const paths = [
      '/v1/portal/auth/wallet-login',
      '/v1/auth/wallet-login',
      '/auth/wallet-login',
    ]

    let lastResult: Awaited<ReturnType<typeof apiCall<{ token?: string }>>> | null = null
    for (const path of paths) {
      const result = await apiCall<{ token?: string }>('POST', path, payload)
      if (result.ok) return result
      lastResult = result

      const errorMessage = getApiErrorMessage(result.data)
      const isMissingRoute = result.status === 404 || errorMessage === 'Non-JSON response'
      if (!isMissingRoute) break
    }

    return lastResult ?? { ok: false, status: 0, data: { error: 'Wallet authentication failed.' } }
  }

  async function performWalletLogin(provider: InjectedWalletProvider) {
    const accountAddress = await connectWalletAndGetAddress(provider)

    if (!/^0x[a-fA-F0-9]{63,64}$/.test(accountAddress)) {
      throw new Error('Invalid wallet address format received from wallet.')
    }

    const nonce = Date.now().toString()
    const message = `Sign in to OpenSignal\nAddress: ${accountAddress}\nNonce: ${nonce}`
    const messageBytes = new TextEncoder().encode(message)

    const signMessage = getWalletMessageSigner(provider)
    if (!signMessage) {
      throw new Error('This wallet does not support message signing.')
    }

    const signatureResult = await signMessage({
      message: messageBytes,
      account: provider.accounts?.[0] ?? { address: accountAddress },
      chain: 'sui:testnet',
    })

    const signature = signatureResult?.signature
    if (!signature) {
      throw new Error('Wallet did not return a signature. Please try again.')
    }

    const r = await postWalletLogin({
      walletAddress: accountAddress,
      message,
      signature,
      nonce,
    })

    if (r.ok && r.data.token) {
      setJwt(r.data.token)
      const short = `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
      const providerName = provider.name?.trim() || 'Sui wallet'
      setWalletState({ ok: true, msg: `Signed in with ${providerName} (${short})` })
      show('Wallet authentication successful')
      onNavigate?.('apps')
      return
    }

    throw new Error(getApiErrorMessage(r.data, 'Wallet authentication failed.'))
  }

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
      setWalletState(null)
      if (walletProviders.length > 1) {
        setWalletPickerOpen(true)
        return
      }

      const provider = walletProviders[0]
      if (!provider) {
        setWalletState({ ok: false, msg: 'No Sui wallet detected. Install Slush, refresh the page, and allow the extension on this site.' })
        return
      }

      setWalletLoading(true)
      try {
        await performWalletLogin(provider)
      } catch (error) {
        setWalletState({ ok: false, msg: error instanceof Error ? error.message : 'Wallet sign-in failed.' })
        console.error('Wallet login error:', error)
      } finally {
        setWalletLoading(false)
        setWalletPickerOpen(false)
      }
  }

    async function confirmSelectedWallet() {
      const provider = walletProviders[selectedWalletIndex] ?? walletProviders[0]
      if (!provider) {
        setWalletPickerOpen(false)
        return
      }

      setWalletLoading(true)
      setWalletPickerOpen(false)
      setWalletState(null)

      try {
        await performWalletLogin(provider)
      } catch (error) {
        setWalletState({ ok: false, msg: error instanceof Error ? error.message : 'Wallet sign-in failed.' })
        console.error('Wallet login error:', error)
      } finally {
        setWalletLoading(false)
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
          {walletDetected && walletProviders.length > 0 && (
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Detected wallet{walletProviders.length > 1 ? 's' : ''}: {walletProviders.map((wallet) => wallet.name?.trim() || 'Sui wallet').join(', ')}
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

      <WalletPickerDialog
        open={walletPickerOpen}
        wallets={walletProviders}
        selectedIndex={selectedWalletIndex}
        onSelectedIndexChange={setSelectedWalletIndex}
        onCancel={() => setWalletPickerOpen(false)}
        onConfirm={confirmSelectedWallet}
        title="Choose a wallet to connect"
        description="Select the wallet extension you want to use for this sign-in."
      />

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
