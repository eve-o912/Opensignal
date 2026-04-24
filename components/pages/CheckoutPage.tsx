'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc'
import { Transaction } from '@mysten/sui/transactions'
import { useAuth } from '@/context/AuthContext'
import { apiCall, getApiErrorMessage } from '@/lib/api'
import SectionHeader from '@/components/layout/SectionHeader'
import FormPanel from '@/components/layout/FormPanel'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import ResponseBox from '@/components/ui/ResponseBox'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { CheckoutSession } from '@/types'

interface PortalApp {
  id: string
  name: string
}

interface CheckoutCreateResponse {
  session: CheckoutSession
  checkoutToken: string
  checkoutUrl: string
}

interface CheckoutLookupResponse {
  session: CheckoutSession
}

interface CheckoutSponsorResponse {
  session: {
    id: string
    status: string
  }
  transactionBytes?: string
  sponsorSignature?: string
  paymentIntent?: {
    merchantReference?: string | null
    recipient?: string | null
    purchaseAmountMist?: number | null
    memo?: string | null
  }
}

interface LinkedWalletInfo {
  address: string
  provider: string
  signature?: string
  message?: string
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

function extractSignature(result: Record<string, unknown>): string {
  if (typeof result.signature === 'string') return result.signature
  if (typeof result.txSignature === 'string') return String(result.txSignature)

  const signatures = result.signatures
  if (Array.isArray(signatures) && typeof signatures[0] === 'string') {
    return signatures[0]
  }

  return ''
}

function getWalletSigners(provider: InjectedWalletProvider): Array<(input: Record<string, unknown>) => Promise<Record<string, unknown>>> {
  const features = (provider.features ?? {}) as Record<string, unknown>
  const featureSignTransaction = (features['sui:signTransaction'] as { signTransaction?: (input: Record<string, unknown>) => Promise<Record<string, unknown>> } | undefined)?.signTransaction
  const featureSignTransactionBlock = (features['sui:signTransactionBlock'] as { signTransactionBlock?: (input: Record<string, unknown>) => Promise<Record<string, unknown>> } | undefined)?.signTransactionBlock

  return [
    featureSignTransaction,
    provider.signTransaction,
    featureSignTransactionBlock,
    provider.signTransactionBlock,
  ].filter((fn): fn is (input: Record<string, unknown>) => Promise<Record<string, unknown>> => typeof fn === 'function')
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

function readLinkedWallet(sessionKey: string): LinkedWalletInfo | null {
  if (typeof window === 'undefined' || !sessionKey) return null
  const stored = localStorage.getItem(`os_linked_wallet:${sessionKey}`)
  if (!stored) return null

  try {
    return JSON.parse(stored) as LinkedWalletInfo
  } catch {
    return null
  }
}

function saveLinkedWallet(sessionKey: string, wallet: LinkedWalletInfo | null) {
  if (typeof window === 'undefined' || !sessionKey) return
  const key = `os_linked_wallet:${sessionKey}`
  if (!wallet) {
    localStorage.removeItem(key)
    return
  }

  localStorage.setItem(key, JSON.stringify(wallet))
}

function resolveRpcUrl(network: 'testnet' | 'mainnet'): string {
  return network === 'mainnet'
    ? 'https://fullnode.mainnet.sui.io:443'
    : 'https://fullnode.testnet.sui.io:443'
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export default function CheckoutPage() {
  const { jwt } = useAuth()
  const searchParams = useSearchParams()

  const sessionId = searchParams.get('checkoutSessionId') ?? ''
  const checkoutToken = searchParams.get('checkoutToken') ?? ''

  const [apps, setApps] = useState<PortalApp[]>([])
  const [selectedAppId, setSelectedAppId] = useState('')
  const [reference, setReference] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet')
  const [memo, setMemo] = useState('')
  const [expiresInMinutes, setExpiresInMinutes] = useState('30')
  const [merchantLoading, setMerchantLoading] = useState(false)
  const [merchantState, setMerchantState] = useState<{ ok: boolean; msg: string; raw?: Record<string, unknown> } | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [sessionDetails, setSessionDetails] = useState<CheckoutSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const [sender, setSender] = useState('')
  const [linkedWallet, setLinkedWallet] = useState<LinkedWalletInfo | null>(null)
  const [walletLinkLoading, setWalletLinkLoading] = useState(false)
  const [walletLinkState, setWalletLinkState] = useState<{ ok: boolean; msg: string } | null>(null)
  const [transactionKind, setTransactionKind] = useState('')
  const [txBuildLoading, setTxBuildLoading] = useState(false)
  const [txBuildState, setTxBuildState] = useState<{ ok: boolean; msg: string } | null>(null)
  const [maxGasBudget, setMaxGasBudget] = useState('')
  const [userSignature, setUserSignature] = useState('')
  const [buyerLoading, setBuyerLoading] = useState(false)
  const [buyerState, setBuyerState] = useState<{ ok: boolean; msg: string; raw?: Record<string, unknown> } | null>(null)

  const publicCheckoutLink = useMemo(() => {
    if (!checkoutUrl) return ''
    return checkoutUrl
  }, [checkoutUrl])

  useEffect(() => {
    async function loadApps() {
      if (!jwt) {
        setApps([])
        return
      }

      const r = await apiCall<{ apps?: PortalApp[] }>('GET', '/v1/portal/apps', undefined, jwt)
      if (r.ok) {
        const appList = r.data.apps ?? []
        setApps(appList)
        setSelectedAppId((current) => current || appList[0]?.id || '')
      }
    }

    loadApps()
  }, [jwt])

  useEffect(() => {
    async function loadSession() {
      if (!sessionId || !checkoutToken) {
        setSessionDetails(null)
        setSessionError(null)
        return
      }

      setSessionLoading(true)
      setSessionError(null)
      const r = await apiCall<CheckoutLookupResponse>('GET', `/v1/checkout/sessions/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(checkoutToken)}`)
      setSessionLoading(false)
      if (r.ok) {
        setSessionDetails(r.data.session)
        setRecipient(r.data.session.recipient)
        setAmount(String(r.data.session.purchaseAmountMist))
        setNetwork(r.data.session.network === 'mainnet' ? 'mainnet' : 'testnet')
        setTransactionKind('')
        setUserSignature('')
        setTxBuildState(null)

        const stored = readLinkedWallet(r.data.session.id)
        if (stored) {
          setLinkedWallet(stored)
          setSender(stored.address)
        }
      } else {
        setSessionDetails(null)
        setTransactionKind('')
        setUserSignature('')
        setTxBuildState(null)

        if (r.status === 410) {
          setSessionError('This checkout session expired. Create a fresh checkout session and open the new link.')
        } else if (r.status === 404) {
          setSessionError('Checkout session not found. The link may be old or invalid.')
        } else if (r.status === 401) {
          setSessionError('Invalid checkout token. Create a new checkout session.')
        } else {
          setSessionError(getApiErrorMessage(r.data, 'Could not load checkout session.'))
        }
      }
    }

    loadSession()
  }, [sessionId, checkoutToken])

  useEffect(() => {
    if (!sessionDetails || !sender || transactionKind || txBuildLoading) return

    buildTransactionKindFromIntent()
  }, [sessionDetails, sender])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const sessionKey = sessionDetails?.id || sessionId
    if (!sessionKey) return

    const stored = readLinkedWallet(sessionKey)
    if (stored) {
      setLinkedWallet(stored)
      if (!sender) setSender(stored.address)
    }
  }, [sender, sessionDetails?.id, sessionId])

  async function linkWallet() {
    setWalletLinkLoading(true)
    setWalletLinkState(null)

    try {
      const providers = getInjectedWalletProviders()
      if (!providers.length) {
        throw new Error('No Sui wallet extension detected. Install a compatible wallet and try again.')
      }

      const provider = providers[0]
      const connected = await provider.connect?.({})
      const accountAddress = connected?.accounts?.[0]?.address ?? (await provider.getAccounts?.())?.[0]?.address

      if (!accountAddress) {
        throw new Error('Wallet did not return an account address.')
      }

      const message = `OpenSignal wallet link\nSession: ${sessionDetails?.id ?? sessionId ?? 'merchant-flow'}\nAddress: ${accountAddress}\nNonce: ${Date.now()}`
      const signatureResult = await provider.signMessage?.({ message })

      const walletInfo: LinkedWalletInfo = {
        address: accountAddress,
        provider: provider.name ?? 'Sui wallet',
        signature: signatureResult?.signature,
        message,
      }

      const sessionKey = sessionDetails?.id || sessionId
      if (sessionKey) saveLinkedWallet(sessionKey, walletInfo)

      setLinkedWallet(walletInfo)
      setSender(accountAddress)
      setTransactionKind('')
      setUserSignature('')
      setTxBuildState(null)
      setWalletLinkState({ ok: true, msg: `Wallet linked: ${accountAddress}` })
    } catch (error) {
      setWalletLinkState({ ok: false, msg: error instanceof Error ? error.message : 'Wallet link failed.' })
    } finally {
      setWalletLinkLoading(false)
    }
  }

  async function createCheckoutSession() {
    if (!jwt || !selectedAppId) return

    setMerchantLoading(true)
    setMerchantState(null)
    const r = await apiCall<CheckoutCreateResponse>(
      'POST',
      '/v1/portal/checkout/sessions',
      {
        appId: selectedAppId,
        recipient,
        purchaseAmountMist: parseInt(amount, 10),
        network,
        memo: memo || undefined,
        merchantReference: reference || undefined,
        expiresInMinutes: parseInt(expiresInMinutes, 10) || 30,
      },
      jwt,
    )
    setMerchantLoading(false)

    if (r.ok) {
      setCheckoutUrl(r.data.checkoutUrl)
      setSessionDetails(r.data.session)
      setTransactionKind('')
      setUserSignature('')
      setTxBuildState(null)
      setMerchantState({
        ok: true,
        msg: 'Checkout session created. Share the link with the customer so they can complete payment without paying gas.',
        raw: { checkoutUrl: r.data.checkoutUrl, checkoutToken: r.data.checkoutToken, session: r.data.session },
      })
    } else {
      setMerchantState({ ok: false, msg: getApiErrorMessage(r.data, 'Could not create checkout session.') })
    }
  }

  async function buildTransactionKindFromIntent(): Promise<string | null> {
    if (!sessionDetails || !sender) return null

    setTxBuildLoading(true)
    setTxBuildState(null)
    try {
      const targetNetwork = sessionDetails.network === 'mainnet' ? 'mainnet' : 'testnet'
      const client = new SuiJsonRpcClient({ url: resolveRpcUrl(targetNetwork), network: targetNetwork })
      const amountMist = BigInt(sessionDetails.purchaseAmountMist)

      const coins = await client.getCoins({
        owner: sender,
        coinType: '0x2::sui::SUI',
        limit: 50,
      })

      const spendCoin = coins.data.find((coin: { balance: string; coinObjectId: string }) => BigInt(coin.balance) >= amountMist)
      if (!spendCoin) {
        throw new Error('Linked wallet has insufficient SUI balance for this payment amount.')
      }

      const tx = new Transaction()
      tx.setSender(sender)

      const [paymentCoin] = tx.splitCoins(
        tx.object(spendCoin.coinObjectId),
        [tx.pure.u64(amountMist.toString())],
      )

      tx.moveCall({
        target: '0x2::transfer::public_transfer',
        typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
        arguments: [paymentCoin, tx.pure.address(sessionDetails.recipient)],
      })

      const kindBytes = await tx.build({
        client,
        onlyTransactionKind: true,
      })

      const kindBase64 = bytesToBase64(kindBytes)
      setTransactionKind(kindBase64)
      setTxBuildState({ ok: true, msg: 'Transaction bytes generated from checkout intent.' })
      return kindBase64
    } catch (error) {
      setTransactionKind('')
      setTxBuildState({
        ok: false,
        msg: error instanceof Error ? error.message : 'Could not build transaction bytes from intent.',
      })
      return null
    } finally {
      setTxBuildLoading(false)
    }
  }

  async function signSponsoredTransactionBytes(bytesBase64: string): Promise<string | null> {
    if (!sender) return null

    const providers = getInjectedWalletProviders()
    const preferred = providers.find((provider) => provider.name === linkedWallet?.provider)
    const provider = preferred ?? providers[0]

    const signers = provider ? getWalletSigners(provider) : []
    if (!provider || signers.length === 0) {
      throw new Error('Connected wallet does not support transaction signing in this browser. Use a Sui wallet with signTransaction support.')
    }

    const chain = `sui:${sessionDetails?.network === 'mainnet' ? 'mainnet' : 'testnet'}`
    const providerAccount = provider.accounts?.find((account) => account.address === sender) ?? provider.accounts?.[0]
    const accountInput = providerAccount ?? { address: sender }

    const attempts: Array<Record<string, unknown>> = [
      { transaction: bytesBase64, account: accountInput, chain },
      { transaction: base64ToBytes(bytesBase64), account: accountInput, chain },
      { transaction: bytesBase64, chain },
      { transactionBlock: bytesBase64, account: accountInput, chain },
      { transactionBlock: base64ToBytes(bytesBase64), account: accountInput, chain },
      { transactionBlock: bytesBase64, chain },
    ]

    for (const signer of signers) {
      for (const input of attempts) {
        try {
          const result = await signer(input)
          const signature = extractSignature(result)
          if (signature) return signature
        } catch {
          // Try next signer/variant.
        }
      }
    }

    throw new Error('Wallet rejected sponsored transaction signing.')
  }

  async function completeCheckout() {
    if (!sessionId || !checkoutToken || !sender) return

    setBuyerLoading(true)
    setBuyerState(null)
    setUserSignature('')

    let kind = transactionKind
    if (!kind) {
      const built = await buildTransactionKindFromIntent()
      if (!built) {
        setBuyerLoading(false)
        return
      }
      kind = built
    }

    const r = await apiCall<CheckoutSponsorResponse>(
      'POST',
      `/v1/checkout/sessions/${encodeURIComponent(sessionId)}/sponsor`,
      {
        token: checkoutToken,
        sender,
        transactionKind: kind,
        ...(maxGasBudget ? { maxGasBudget: parseInt(maxGasBudget, 10) } : {}),
      },
    )

    if (r.ok) {
      let signedByUser = ''
      try {
        if (r.data.transactionBytes) {
          const signature = await signSponsoredTransactionBytes(r.data.transactionBytes)
          if (signature) {
            signedByUser = signature
            setUserSignature(signature)
          }
        }
      } catch (error) {
        setBuyerLoading(false)
        setSessionDetails((current) => current ? { ...current, status: 'COMPLETED' } : current)
        setBuyerState({
          ok: true,
          msg: 'Sponsorship was approved and the checkout session is completed. Wallet signing is not supported in this browser, so no user signature was captured.',
          raw: {
            signingError: error instanceof Error ? error.message : 'Wallet signing unavailable',
            sponsorSignature: r.data.sponsorSignature,
            transactionBytes: r.data.transactionBytes,
          },
        })
        return
      }

      setBuyerLoading(false)
      setBuyerState({
        ok: true,
        msg: signedByUser
          ? 'Payment intent converted, sponsored by OpenSignal, and signed by the linked wallet.'
          : 'Payment intent converted and sponsored by OpenSignal. Wallet signature was not returned by this provider API.',
        raw: {
          ...r.data,
          userSignature: signedByUser || 'Wallet signature not captured by this provider API',
        } as Record<string, unknown>,
      })
      setSessionDetails((current) => current ? { ...current, status: 'COMPLETED' } : current)
    } else {
      setBuyerLoading(false)
      if (r.status === 410) {
        setSessionError('This checkout session expired while you were processing it. Create a new session and retry.')
      } else if (r.status === 409) {
        setSessionError('This checkout session is already processed. If payment already went through, this is expected.')
      }
      setBuyerState({ ok: false, msg: getApiErrorMessage(r.data, 'Checkout failed. Check the session link and transaction bytes.') })
    }
  }

  return (
    <div className="space-y-4">
      <div className="w-full lg:w-[95%] lg:ml-auto space-y-4">
        <SectionHeader
          eyebrow="Payments"
          title="Sponsored checkout"
          sub="Create a merchant checkout session, then let the customer complete the payment from their linked wallet while OpenSignal covers gas."
        />

        {sessionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">
            {sessionError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          <FormPanel step={1} title="Create a checkout session" desc="Merchant backend creates a time-limited payment intent with the recipient and amount locked in.">
            {!jwt && <p className="text-sm text-blue-400 mb-3">Sign in as a merchant to mint checkout sessions.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <label className="text-xs font-semibold text-blue-700 flex flex-col gap-1.5">
                App
                <select
                  className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  disabled={!apps.length}
                >
                  {!apps.length && <option value="">No apps available</option>}
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>{app.name}</option>
                  ))}
                </select>
              </label>
              <Input label="Merchant reference" placeholder="order-12345"
                value={reference} onChange={(e) => setReference(e.target.value)} />
              <Input label="Recipient address" placeholder="0x..."
                value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              <Input label="Amount (MIST)" placeholder="100000000" type="number"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Input label="Expires in minutes" placeholder="30" type="number"
                value={expiresInMinutes} onChange={(e) => setExpiresInMinutes(e.target.value)} />
              <label className="text-xs font-semibold text-blue-700 flex flex-col gap-1.5">
                Network
                <select
                  className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value === 'mainnet' ? 'mainnet' : 'testnet')}
                >
                  <option value="testnet">testnet</option>
                  <option value="mainnet">mainnet</option>
                </select>
              </label>
            </div>
            <Textarea label="Memo (optional)" placeholder="Subscription, one-time purchase, etc."
              value={memo} onChange={(e) => setMemo(e.target.value)} />
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Button variant="primary" onClick={createCheckoutSession} disabled={merchantLoading || !jwt || !selectedAppId || !recipient || !amount}>
                {merchantLoading ? 'Creating…' : 'Create checkout session'}
              </Button>
              {sessionDetails && <Badge variant={sessionDetails.status === 'COMPLETED' ? 'ok' : 'warn'}>{sessionDetails.status}</Badge>}
            </div>
            {merchantLoading && <Spinner label="Creating checkout session…" />}
            {merchantState && <ResponseBox ok={merchantState.ok} friendly={merchantState.msg} raw={merchantState.raw} />}
            {publicCheckoutLink && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900 break-all">
                <p className="font-semibold mb-1">Checkout link</p>
                <a href={publicCheckoutLink} className="underline">{publicCheckoutLink}</a>
              </div>
            )}
          </FormPanel>

          <FormPanel step={2} title="Customer checkout" desc="Open checkout link, auto-build transaction bytes, then sign the sponsored bytes from the linked wallet.">
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Linked wallet</p>
                  <p className="text-xs text-blue-500">Connect once to auto-fill sender, auto-generate bytes, and sign sponsored transactions.</p>
                </div>
                <Button variant="sm" onClick={linkWallet} disabled={walletLinkLoading}>
                  {walletLinkLoading ? 'Linking…' : linkedWallet ? 'Relink wallet' : 'Link wallet'}
                </Button>
              </div>
              {linkedWallet && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="ok">{linkedWallet.provider}</Badge>
                  <span className="text-xs text-blue-900 font-mono">{linkedWallet.address}</span>
                </div>
              )}
              {walletLinkState && (
                <div className={`mt-3 rounded-xl px-3 py-2 text-sm border ${walletLinkState.ok ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {walletLinkState.msg}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Input label="Checkout session ID" value={sessionId} readOnly placeholder="Generated from merchant flow" />
              <Input label="Checkout token" value={checkoutToken} readOnly placeholder="Generated from merchant flow" />
              <Input label="Linked wallet address" placeholder="0x..."
                value={sender} onChange={(e) => setSender(e.target.value)} />
              <Input label="Gas cap (optional)" type="number" placeholder="Leave blank to use app policy"
                value={maxGasBudget} onChange={(e) => setMaxGasBudget(e.target.value)} />
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-3 mb-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Transaction bytes</p>
                  <p className="text-xs text-blue-500">Generated automatically from session intent and linked wallet balance.</p>
                </div>
                <Button
                  variant="sm"
                  onClick={buildTransactionKindFromIntent}
                  disabled={txBuildLoading || !sessionDetails || !sender}
                >
                  {txBuildLoading ? 'Generating…' : transactionKind ? 'Regenerate bytes' : 'Generate bytes'}
                </Button>
              </div>
              {txBuildLoading && <Spinner label="Building transaction kind bytes…" />}
              {txBuildState && (
                <div className={`mt-3 rounded-xl px-3 py-2 text-sm border ${txBuildState.ok ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {txBuildState.msg}
                </div>
              )}
              {transactionKind && (
                <pre className="mt-3 rounded-xl px-3.5 py-3 text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto border bg-blue-50 border-blue-100 text-blue-900">
                  {transactionKind}
                </pre>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Button variant="primary" onClick={completeCheckout} disabled={buyerLoading || txBuildLoading || !sessionId || !checkoutToken || !sender || !!sessionError || sessionDetails?.status !== 'ACTIVE'}>
                {buyerLoading ? 'Completing…' : 'Complete checkout'}
              </Button>
              {sessionLoading && <Spinner label="Loading checkout session…" />}
              {sessionDetails && <Badge variant={sessionDetails.status === 'COMPLETED' ? 'ok' : 'warn'}>{sessionDetails.status}</Badge>}
            </div>
            {sessionDetails && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-white p-3 text-sm text-blue-900 space-y-1">
                <p><span className="font-semibold">Merchant:</span> {sessionDetails.dapp?.name ?? 'Unknown'}</p>
                <p><span className="font-semibold">Recipient:</span> {sessionDetails.recipient}</p>
                <p><span className="font-semibold">Amount:</span> {sessionDetails.purchaseAmountMist.toLocaleString()} MIST</p>
                <p><span className="font-semibold">Memo:</span> {sessionDetails.memo ?? 'None'}</p>
              </div>
            )}
            {userSignature && (
              <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900 break-all">
                <p className="font-semibold mb-1">User signature</p>
                <p className="font-mono">{userSignature}</p>
              </div>
            )}
            {buyerState && <ResponseBox ok={buyerState.ok} friendly={buyerState.msg} raw={buyerState.raw} />}
          </FormPanel>
        </div>
      </div>
    </div>
  )
}
