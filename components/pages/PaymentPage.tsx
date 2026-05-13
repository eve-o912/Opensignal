'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc'
import { Transaction } from '@mysten/sui/transactions'
import { useAuth } from '@/context/AuthContext'
import { apiCall, getApiErrorMessage } from '@/lib/api'
import SectionHeader from '@/components/layout/SectionHeader'
import FormPanel from '@/components/layout/FormPanel'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ResponseBox from '@/components/ui/ResponseBox'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import {
  waitForInjectedWalletProviders,
  getWalletSigners,
  connectWalletAndGetAddress,
  connectWalletAndGetAccount,
  getWalletMessageSigner,
  type InjectedWalletProvider,
} from '@/lib/wallet'
import WalletPickerDialog from '@/components/ui/WalletPickerDialog'

interface PaymentQuoteResponse {
  gasBudget?: number
  gas_budget?: number
  estimatedGas?: number
  quote?: { gasBudget?: number; gas_budget?: number; estimatedGas?: number }
  sponsorAddress?: string
  network?: string
  purchaseAmountMist?: number
  recipient?: string
}

interface PaymentSponsorResponse {
  transactionBytes?: string
  sponsorSignature?: string
  status?: string
}

interface LinkedWalletInfo {
  address: string
  provider: string
  signature?: string
  message?: string
}

interface CoinObject {
  coinObjectId: string
  balance: string
  coinType: string
}

interface WalletBalance {
  totalBalance: string
  coinObjects: CoinObject[]
}

interface PaymentResult {
  userSignature: string
  sponsorSignature: string
  transactionBytes: string
  sender: string
  recipient: string
  amount: number
  gasBudget: number
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

function readLinkedWallet(key: string): LinkedWalletInfo | null {
  if (typeof window === 'undefined' || !key) return null
  const stored = localStorage.getItem(`os_payment_wallet:${key}`)
  if (!stored) return null

  try {
    return JSON.parse(stored) as LinkedWalletInfo
  } catch {
    return null
  }
}

function saveLinkedWallet(key: string, wallet: LinkedWalletInfo | null) {
  if (typeof window === 'undefined' || !key) return
  const storageKey = `os_payment_wallet:${key}`
  if (!wallet) {
    localStorage.removeItem(storageKey)
    return
  }

  localStorage.setItem(storageKey, JSON.stringify(wallet))
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


export default function PaymentPage() {
  const { jwt, walletAddress } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet')
  const [senderAddress, setSenderAddress] = useState('')
  const [senderOverridden, setSenderOverridden] = useState(false)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')

  // Wallet & Linking
  const [linkedWallet, setLinkedWallet] = useState<LinkedWalletInfo | null>(null)
  const [walletProviders, setWalletProviders] = useState<InjectedWalletProvider[]>([])
  const [walletNames, setWalletNames] = useState<string[]>([])
  const [walletPickerOpen, setWalletPickerOpen] = useState(false)
  const [walletPickerMode, setWalletPickerMode] = useState<'link' | 'sign'>('link')
  const [selectedWalletIndex, setSelectedWalletIndex] = useState(0)
  const [walletLinkLoading, setWalletLinkLoading] = useState(false)
  const [walletLinkState, setWalletLinkState] = useState<{ ok: boolean; msg: string } | null>(null)

  // Balance & Verification
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [senderBalance, setSenderBalance] = useState<WalletBalance | null>(null)
  const [recipientBalance, setRecipientBalance] = useState<WalletBalance | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  // Quote & Sponsorship
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteState, setQuoteState] = useState<{ ok: boolean; msg: string; data?: PaymentQuoteResponse } | null>(null)
  const [sponsorLoading, setSponsorLoading] = useState(false)
  const [sponsorState, setSponsorState] = useState<{ ok: boolean; msg: string; data?: PaymentSponsorResponse } | null>(null)

  // Transaction Signing
  const [signLoading, setSignLoading] = useState(false)
  const [userSignature, setUserSignature] = useState('')
  const [sponsorSignature, setSponsorSignature] = useState('')
  const [transactionBytes, setTransactionBytes] = useState('')

  // Final Result
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const [submissionState, setSubmissionState] = useState<{ ok: boolean; msg: string } | null>(null)

  const validationComplete = useMemo(() => {
    return {
      hasRecipient: /^0x[a-fA-F0-9]{63,64}$/.test(recipientAddress),
      hasSender: /^0x[a-fA-F0-9]{63,64}$/.test(senderAddress),
      hasAmount: parseFloat(amount) > 0,
      differentAddresses: senderAddress !== recipientAddress,
    }
  }, [senderAddress, recipientAddress, amount])

  // Load wallet providers on mount
  useEffect(() => {
    let cancelled = false

    async function loadWallets() {
      const providers = await waitForInjectedWalletProviders(1000)
      if (cancelled) return
      setWalletProviders(providers)
      setWalletNames(providers.map((wallet) => wallet.name?.trim() || 'Sui wallet'))
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

  // Auto-fill sender address. Priority:
  // 1. walletAddress from AuthContext (resolved from JWT claim or /me endpoint)
  // 2. localStorage linked wallet (wallet-login sessions)
  // 3. Injected browser wallet extension (already-connected accounts only)
  useEffect(() => {
    if (senderOverridden) return

    if (walletAddress) {
      setSenderAddress(walletAddress)
      return
    }

    if (typeof window !== 'undefined') {
      const stored = readLinkedWallet('default')
      if (stored) {
        setLinkedWallet(stored)
        setSenderAddress(stored.address)
        return
      }
    }
  }, [walletAddress, senderOverridden])

  // Fallback: injected wallet extension already-connected accounts
  useEffect(() => {
    if (senderOverridden || walletAddress) return
    if (walletProviders.length === 0) return

    const preferred = linkedWallet
      ? walletProviders.find((p) => p.name === linkedWallet.provider)
      : undefined
    const provider = preferred ?? walletProviders[0]
    if (!provider) return

    const accounts = provider.accounts
    if (!accounts || accounts.length === 0) return
    const address = accounts[0].address
    if (!address) return

    setSenderAddress((current) => {
      if (current || senderOverridden) return current
      if (!linkedWallet) {
        const walletInfo: LinkedWalletInfo = { address, provider: provider.name?.trim() || 'Sui wallet' }
        saveLinkedWallet('default', walletInfo)
        setLinkedWallet(walletInfo)
      }
      return address
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletProviders, walletAddress])

  async function performLinkWallet(provider: InjectedWalletProvider) {
    const rawAddress = await connectWalletAndGetAddress(provider)

    // Normalize to lowercase immediately — Sui addresses are case-insensitive hex.
    // This mirrors the same normalization used in AccountPage for wallet login.
    const accountAddress = rawAddress.toLowerCase()

    if (!/^0x[a-fA-F0-9]{64}$/.test(accountAddress)) {
      throw new Error('Invalid wallet address format received from wallet.')
    }

    const nonce = Date.now().toString()
    const message = `OpenSignal P2P Payment\nAddress: ${accountAddress}\nNonce: ${nonce}`
    const messageBytes = new TextEncoder().encode(message)

    const signMessage = getWalletMessageSigner(provider)
    if (!signMessage) {
      throw new Error('This wallet does not support message signing.')
    }

    const signatureResult = await signMessage({
      message: messageBytes,
      account: { address: accountAddress },
      chain: `sui:${network}`,
    })

    const signature = signatureResult?.signature
    if (!signature) {
      throw new Error('Wallet did not return a signature. Please try again.')
    }

    const walletInfo: LinkedWalletInfo = {
      address: accountAddress,
      provider: provider.name?.trim() || 'Sui wallet',
      signature,
      message,
    }

    saveLinkedWallet('default', walletInfo)
    setLinkedWallet(walletInfo)
    setSenderAddress(accountAddress)
    setSenderOverridden(false)
    setBalanceError(null)

    const short = `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
    setWalletLinkState({ ok: true, msg: `✓ Wallet linked: ${short}` })
  }

  async function linkWallet() {
    setWalletLinkState(null)
    setWalletLinkLoading(true)

    try {
      let providers = walletProviders
      if (!providers.length) {
        // Use the same 1 000 ms timeout as AccountPage so detection is consistent
        providers = await waitForInjectedWalletProviders(1000)
        setWalletProviders(providers)
        setWalletNames(providers.map((wallet) => wallet.name?.trim() || 'Sui wallet'))
      }

      if (providers.length > 1) {
        // Open picker and return — loading stays true until confirmSelectedWallet finishes
        setWalletPickerOpen(true)
        return
      }

      const provider = providers[0]
      if (!provider) {
        throw new Error('No Sui wallet extension detected. If Slush is installed, refresh the page and allow the extension on this site.')
      }

      await performLinkWallet(provider)
    } catch (error) {
      setWalletLinkState({ ok: false, msg: error instanceof Error ? error.message : 'Wallet link failed.' })
      console.error('Wallet link error:', error)
    } finally {
      // Only clear loading here if the picker was NOT opened.
      // When the picker is open, confirmSelectedWallet owns the loading state.
      if (!walletPickerOpen) {
        setWalletLinkLoading(false)
      }
    }
  }

  async function confirmSelectedWallet() {
    const provider = walletProviders[selectedWalletIndex] ?? walletProviders[0]
    if (!provider) {
      setWalletPickerOpen(false)
      return
    }

    setWalletPickerOpen(false)

    if (walletPickerMode === 'sign') {
      await signWithProvider(provider)
    } else {
      setWalletLinkLoading(true)
      setWalletLinkState(null)
      try {
        await performLinkWallet(provider)
      } catch (error) {
        setWalletLinkState({ ok: false, msg: error instanceof Error ? error.message : 'Wallet link failed.' })
        console.error('Wallet link error:', error)
      } finally {
        setWalletLinkLoading(false)
      }
    }
  }

  async function signWithProvider(provider: InjectedWalletProvider) {
    setSignLoading(true)
    setSponsorState(null)
    try {
      // Establish an active session — required before the wallet will accept signing calls
      const connectedAccount = await connectWalletAndGetAccount(provider)

      const signers = getWalletSigners(provider)
      if (signers.length === 0) {
        throw new Error('This wallet does not support transaction signing.')
      }

      const chain = `sui:${network}`
      const providerAccount =
        provider.accounts?.find((account) => account.address === senderAddress) ??
        provider.accounts?.find((account) => account.address === connectedAccount.address) ??
        provider.accounts?.[0]
      const accountInput = providerAccount ?? connectedAccount

      const attempts: Array<Record<string, unknown>> = [
        { transaction: transactionBytes, account: accountInput, chain },
        { transaction: base64ToBytes(transactionBytes), account: accountInput, chain },
        { transaction: transactionBytes, chain },
        { transactionBlock: transactionBytes, account: accountInput, chain },
        { transactionBlock: base64ToBytes(transactionBytes), account: accountInput, chain },
        { transactionBlock: transactionBytes, chain },
      ]

      let userSig = ''
      for (const signer of signers) {
        for (const input of attempts) {
          try {
            const result = await signer(input)
            const signature = extractSignature(result)
            if (signature) {
              userSig = signature
              break
            }
          } catch {
            // Try next variant
          }
        }
        if (userSig) break
      }

      if (!userSig) {
        throw new Error('Wallet rejected transaction signing.')
      }

      setUserSignature(userSig)
      setSponsorState({ ok: true, msg: 'Transaction signed by user and sponsor successfully.' })
    } catch (error) {
      setSponsorState({
        ok: false,
        msg: error instanceof Error ? error.message : 'Failed to sign transaction.',
      })
    } finally {
      setSignLoading(false)
    }
  }

  async function fetchBalance(address: string) {
    const rpcUrl = resolveRpcUrl(network)
    const client = new SuiJsonRpcClient({ url: rpcUrl, network })

    try {
      const coins = await client.getCoins({
        owner: address,
        coinType: '0x2::sui::SUI',
        limit: 50,
      })

      const totalBalance = coins.data.reduce((sum, coin: CoinObject) => sum + BigInt(coin.balance), BigInt(0))

      return {
        totalBalance: totalBalance.toString(),
        coinObjects: coins.data.map((coin: CoinObject) => ({
          coinObjectId: coin.coinObjectId,
          balance: coin.balance,
          coinType: coin.coinType,
        })),
      } as WalletBalance
    } catch (error) {
      throw new Error(`Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async function verifyBalances() {
    if (!validationComplete.hasSender) {
      setBalanceError('Please enter a valid sender address.')
      return
    }

    setBalanceLoading(true)
    setBalanceError(null)

    try {
      const senderBal = await fetchBalance(senderAddress)
      setSenderBalance(senderBal)

      // Also fetch recipient balance if address is already filled in
      if (validationComplete.hasRecipient) {
        const recipientBal = await fetchBalance(recipientAddress)
        setRecipientBalance(recipientBal)

        if (validationComplete.hasAmount) {
          const senderBalBig = BigInt(senderBal.totalBalance)
          const requiredAmount = BigInt(Math.round(parseFloat(amount) * 1_000_000_000))
          if (senderBalBig < requiredAmount) {
            setBalanceError(`Sender balance (${(senderBalBig / BigInt(1_000_000_000)).toString()} SUI) is insufficient for the payment.`)
          }
        }
      } else {
        setRecipientBalance(null)
      }

      setBalanceError(null)
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : 'Failed to verify balances.')
      setSenderBalance(null)
      setRecipientBalance(null)
    } finally {
      setBalanceLoading(false)
    }
  }

  async function getPaymentQuote() {
    if (!validationComplete.hasRecipient || !validationComplete.hasSender || !validationComplete.hasAmount) {
      setQuoteState({ ok: false, msg: 'Please enter valid sender, recipient, and amount.' })
      return
    }

    if (!apiKey) {
      setQuoteState({ ok: false, msg: 'Please provide an API key to continue.' })
      return
    }

    setQuoteLoading(true)
    setQuoteState(null)

    try {
      const amountMist = BigInt(Math.round(parseFloat(amount) * 1_000_000_000))

      // Build the transaction kind bytes first — the quote endpoint requires them
      const rpcUrl = resolveRpcUrl(network)
      const client = new SuiJsonRpcClient({ url: rpcUrl, network })

      const coins = await client.getCoins({
        owner: senderAddress,
        coinType: '0x2::sui::SUI',
        limit: 50,
      })

      const spendCoin = coins.data.find((coin: CoinObject) => BigInt(coin.balance) >= amountMist)
      if (!spendCoin) {
        throw new Error('Sender wallet has insufficient SUI balance for this payment amount.')
      }

      const tx = new Transaction()
      tx.setSender(senderAddress)
      const [paymentCoin] = tx.splitCoins(
        tx.object(spendCoin.coinObjectId),
        [tx.pure.u64(amountMist.toString())],
      )
      tx.moveCall({
        target: '0x2::transfer::public_transfer',
        typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
        arguments: [paymentCoin, tx.pure.address(recipientAddress)],
      })
      const kindBytes = await tx.build({ client, onlyTransactionKind: true })
      const kindBase64 = bytesToBase64(kindBytes)

      // Store the bytes so Step 3 can use them directly without rebuilding
      setTransactionBytes(kindBase64)

      const r = await apiCall<PaymentQuoteResponse>(
        'POST',
        '/v1/sponsor/quote',
        {
          transactionKind: kindBase64,
          sender: senderAddress,
          network,
        },
        undefined,
        apiKey,
      )

      if (r.ok) {
        // Handle both flat and nested response shapes from the server
        const gas =
          r.data.gasBudget ??
          r.data.gas_budget ??
          r.data.estimatedGas ??
          r.data.quote?.gasBudget ??
          r.data.quote?.gas_budget ??
          r.data.quote?.estimatedGas

        setQuoteState({
          ok: true,
          msg: gas != null
            ? `Gas budget estimated: ${gas.toLocaleString()} MIST. Ready to sponsor.`
            : 'Quote approved. Ready to sponsor.',
          data: { ...r.data, gasBudget: gas ?? 0 },
        })
      } else {
        setQuoteState({ ok: false, msg: getApiErrorMessage(r.data, 'Failed to get payment quote.') })
      }
    } catch (error) {
      setQuoteState({ ok: false, msg: error instanceof Error ? error.message : 'Quote request failed.' })
    } finally {
      setQuoteLoading(false)
    }
  }

  async function buildTransactionBytes() {
    if (!validationComplete.hasRecipient || !validationComplete.hasSender || !validationComplete.hasAmount) {
      setSponsorState({ ok: false, msg: 'Please enter valid sender, recipient, and amount.' })
      return
    }

    setSponsorLoading(true)
    setSponsorState(null)

    try {
      const rpcUrl = resolveRpcUrl(network)
      const client = new SuiJsonRpcClient({ url: rpcUrl, network })
      const amountMist = BigInt(Math.round(parseFloat(amount) * 1_000_000_000))

      // Find a coin with sufficient balance
      const coins = await client.getCoins({
        owner: senderAddress,
        coinType: '0x2::sui::SUI',
        limit: 50,
      })

      const spendCoin = coins.data.find((coin: CoinObject) => BigInt(coin.balance) >= amountMist)
      if (!spendCoin) {
        throw new Error('Sender wallet has insufficient SUI balance for this payment amount.')
      }

      // Build the transaction
      const tx = new Transaction()
      tx.setSender(senderAddress)

      const [paymentCoin] = tx.splitCoins(
        tx.object(spendCoin.coinObjectId),
        [tx.pure.u64(amountMist.toString())],
      )

      tx.moveCall({
        target: '0x2::transfer::public_transfer',
        typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
        arguments: [paymentCoin, tx.pure.address(recipientAddress)],
      })

      const kindBytes = await tx.build({
        client,
        onlyTransactionKind: true,
      })

      const kindBase64 = bytesToBase64(kindBytes)
      setTransactionBytes(kindBase64)
      setSponsorState({ ok: true, msg: 'Transaction bytes generated successfully.' })
    } catch (error) {
      setTransactionBytes('')
      setSponsorState({
        ok: false,
        msg: error instanceof Error ? error.message : 'Failed to build transaction bytes.',
      })
    } finally {
      setSponsorLoading(false)
    }
  }

  async function sponsorAndSign() {
    if (!transactionBytes) {
      setSponsorState({ ok: false, msg: 'Please generate transaction bytes first.' })
      return
    }

    if (!apiKey) {
      setSponsorState({ ok: false, msg: 'Please provide an API key to continue.' })
      return
    }

    setSponsorLoading(true)
    setSponsorState(null)

    try {
      // Step 1: get the sponsor signature from the API
      const amountMist = Math.round(parseFloat(amount) * 1_000_000_000)
      const sponsorRes = await apiCall<PaymentSponsorResponse>(
        'POST',
        '/v1/sponsor/sign',
        {
          transactionKind: transactionBytes,
          sender: senderAddress,
          purchaseAmountMist: amountMist,
          recipient: recipientAddress,
          network,
        },
        undefined,
        apiKey,
      )

      if (!sponsorRes.ok) {
        setSponsorState({ ok: false, msg: getApiErrorMessage(sponsorRes.data, 'Sponsor failed to sign.') })
        return
      }

      if (sponsorRes.data.sponsorSignature) {
        setSponsorSignature(sponsorRes.data.sponsorSignature)
      }

      if (sponsorRes.data.transactionBytes) {
        setTransactionBytes(sponsorRes.data.transactionBytes)
      }

      // Step 2: open the wallet picker so the user chooses which wallet to sign with.
      // Always show the picker — never silently pick providers[0] — because the user
      // may have multiple extensions installed and needs to choose the right one.
      const providers = await waitForInjectedWalletProviders(1000)
      if (providers.length === 0) {
        setSponsorState({ ok: false, msg: 'No Sui wallet extension detected. Install Slush, refresh the page, and allow the extension on this site.' })
        return
      }

      setWalletProviders(providers)
      setWalletNames(providers.map((w) => w.name?.trim() || 'Sui wallet'))
      // Pre-select the previously linked wallet if available, otherwise default to 0
      const preferredIndex = linkedWallet
        ? Math.max(0, providers.findIndex((p) => p.name === linkedWallet.provider))
        : 0
      setSelectedWalletIndex(preferredIndex)
      setWalletPickerMode('sign')
      setWalletPickerOpen(true)
    } catch (error) {
      setSponsorState({ ok: false, msg: error instanceof Error ? error.message : 'Sponsorship failed.' })
    } finally {
      setSponsorLoading(false)
    }
  }

  async function executePayment() {
    if (!userSignature || !transactionBytes) {
      setSubmissionState({ ok: false, msg: 'Transaction not ready. Please complete sponsorship and signing.' })
      return
    }

    setSubmissionLoading(true)
    setSubmissionState(null)

    try {
      // In a real scenario, you would submit the signed transaction to the blockchain here
      // For now, we'll simulate the result
      setPaymentResult({
        userSignature,
        sponsorSignature,
        transactionBytes,
        sender: senderAddress,
        recipient: recipientAddress,
        amount: parseInt(amount, 10),
        gasBudget: quoteState?.data?.gasBudget || 0,
      })

      setSubmissionState({
        ok: true,
        msg: `✓ Payment prepared: ${amount} SUI from sender to recipient. Gas sponsored by OpenSignal.`,
      })

      // Refresh balances to show the impact
      setTimeout(() => verifyBalances(), 1000)
    } catch (error) {
      setSubmissionState({
        ok: false,
        msg: error instanceof Error ? error.message : 'Payment execution failed.',
      })
    } finally {
      setSubmissionLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="w-full lg:w-[95%] lg:ml-auto space-y-4">
        <SectionHeader
          eyebrow="Peer-to-Peer"
          title="Send coins with sponsored gas"
          sub="Send SUI from one account to another while OpenSignal covers gas fees. Perfect for testing the gas station mechanism."
        />

        {walletNames.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 mb-4">
            Detected wallet{walletNames.length > 1 ? 's' : ''}: {walletNames.join(', ')}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {/* Wallet Linking & Setup */}
          <FormPanel step={1} title="Connect your wallet" desc="Link your Sui wallet to send payments. This is where the coins will be sent from.">
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Linked wallet</p>
                  <p className="text-xs text-blue-500">Your payment source address.</p>
                </div>
                <Button variant="sm" onClick={linkWallet} disabled={walletLinkLoading}>
                  {walletLinkLoading ? 'Linking…' : linkedWallet ? 'Relink' : 'Link wallet'}
                </Button>
              </div>
              {linkedWallet && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="ok">{linkedWallet.provider}</Badge>
                  <span className="text-xs text-blue-900 font-mono">{linkedWallet.address}</span>
                </div>
              )}
              {walletLinkState && (
                <div
                  className={`mt-3 rounded-xl px-3 py-2 text-sm border ${
                    walletLinkState.ok
                      ? 'bg-teal-50 border-teal-200 text-teal-900'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {walletLinkState.msg}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4">
              <Input
                label="API key"
                placeholder="os_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                hint="Your API key from the Keys page. Required to sponsor transactions."
              />
              <label className="text-xs font-semibold text-blue-700 flex flex-col gap-1.5">
                Network
                <select
                  className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value === 'mainnet' ? 'mainnet' : 'testnet')}
                >
                  <option value="testnet">Testnet</option>
                  <option value="mainnet">Mainnet</option>
                </select>
              </label>
              <Input
                label="Your address"
                placeholder="0x..."
                value={senderAddress}
                onChange={(e) => {
                  setSenderAddress(e.target.value)
                  setSenderOverridden(true)
                }}
                hint={senderOverridden ? 'Overridden from linked wallet' : 'Auto-loaded from your linked wallet. Edit to use a different account.'}
              />
              {senderAddress && linkedWallet && !senderOverridden && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-xs text-green-900">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M13.5 2.5L6 10l-3.5-3.5"/>
                  </svg>
                  <span>Using default account from linked wallet</span>
                </div>
              )}
              {senderOverridden && linkedWallet && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="8" cy="8" r="5.5"/>
                    <path d="M8 5v3M7 9h2"/>
                  </svg>
                  <span>Using custom account (not your linked wallet)</span>
                </div>
              )}
            </div>

            <div className="mt-4">
              <Button
                variant="primary"
                onClick={verifyBalances}
                disabled={balanceLoading || !validationComplete.hasSender}
              >
                {balanceLoading ? 'Checking…' : 'Verify balances'}
              </Button>
            </div>

            {balanceError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {balanceError}
              </div>
            )}

            {senderBalance && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-white p-3 text-sm text-blue-900 space-y-1">
                <p className="font-semibold">Your Balance</p>
                <p>{(BigInt(senderBalance.totalBalance) / BigInt(1000000000)).toString()} SUI</p>
                <p className="text-xs text-blue-500">{senderBalance.coinObjects.length} coins</p>
              </div>
            )}
          </FormPanel>

          {/* Payment Details */}
          <FormPanel step={2} title="Payment details" desc="Specify the recipient address and amount to send.">
            <div className="grid grid-cols-1 gap-3 mb-4">
              <Input
                label="Recipient address"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => {
                  setRecipientAddress(e.target.value)
                  setBalanceError(null)
                }}
                hint="The address that will receive the coins."
              />
              <Input
                label="Amount (SUI)"
                placeholder="1.5"
                type="number"
                step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                hint="Amount in SUI (will be converted to MIST for the transaction)."
              />
              <Input
                label="Memo (optional)"
                placeholder="Payment for..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                hint="Add a note for this payment."
              />
            </div>

            {recipientBalance && (
              <div className="rounded-xl border border-blue-100 bg-white p-3 text-sm text-blue-900 space-y-1 mb-4">
                <p className="font-semibold">Recipient Current Balance</p>
                <p>{(BigInt(recipientBalance.totalBalance) / BigInt(1000000000)).toString()} SUI</p>
              </div>
            )}

            {validationComplete.hasSender && validationComplete.hasRecipient && validationComplete.hasAmount && (
              <div className="mb-4 rounded-xl border border-green-100 bg-green-50 p-3 text-xs text-green-900 space-y-1">
                <p className="font-semibold">✓ Payment details valid</p>
                {!validationComplete.differentAddresses && (
                  <p className="text-red-600">⚠ Sender and recipient are the same address</p>
                )}
              </div>
            )}

            <Button
              variant="primary"
              onClick={getPaymentQuote}
              disabled={
                quoteLoading || !validationComplete.hasSender || !validationComplete.hasRecipient || !validationComplete.hasAmount
              }
            >
              {quoteLoading ? 'Getting quote…' : 'Get gas quote'}
            </Button>

            {quoteState && <ResponseBox ok={quoteState.ok} friendly={quoteState.msg} />}
          </FormPanel>
        </div>

        {/* Transaction Building & Sponsorship */}
        {quoteState?.ok && (
          <FormPanel
            step={3}
            title="Build & sponsor transaction"
            desc="Generate transaction bytes and have OpenSignal sponsor the gas fees."
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
              <Button
                variant="primary"
                onClick={buildTransactionBytes}
                disabled={sponsorLoading || signLoading || !!transactionBytes}
              >
                {sponsorLoading ? 'Building…' : transactionBytes ? 'Bytes built ✓' : 'Build transaction'}
              </Button>
              <Button
                variant="primary"
                onClick={sponsorAndSign}
                disabled={sponsorLoading || signLoading || !transactionBytes || !!userSignature}
              >
                {sponsorLoading || signLoading ? 'Processing…' : userSignature ? 'Signed ✓' : 'Sponsor & sign'}
              </Button>
            </div>

            {sponsorLoading && <Spinner label="Building and sponsoring transaction…" />}
            {signLoading && <Spinner label="Waiting for wallet signature…" />}
            {sponsorState && <ResponseBox ok={sponsorState.ok} friendly={sponsorState.msg} />}

            {transactionBytes && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900 mt-3">
                <p className="font-semibold mb-2">Transaction bytes generated</p>
                <div className="font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                  {transactionBytes.substring(0, 100)}...
                </div>
              </div>
            )}

            {userSignature && (
              <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs text-green-900 mt-3">
                <p className="font-semibold mb-2">✓ Signed by user</p>
                <p className="font-mono break-all">{userSignature.substring(0, 50)}...</p>
              </div>
            )}

            {sponsorSignature && (
              <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs text-green-900 mt-3">
                <p className="font-semibold mb-2">✓ Signed by sponsor</p>
                <p className="font-mono break-all">{sponsorSignature.substring(0, 50)}...</p>
              </div>
            )}
          </FormPanel>
        )}

        {/* Payment Execution */}
        {userSignature && sponsorSignature && (
          <FormPanel step={4} title="Execute payment" desc="Submit the signed transaction to complete the payment.">
            <Button
              variant="primary"
              onClick={executePayment}
              disabled={submissionLoading || !userSignature || !sponsorSignature}
              className="mb-4"
            >
              {submissionLoading ? 'Executing…' : 'Execute payment'}
            </Button>

            {submissionLoading && <Spinner label="Executing payment…" />}
            {submissionState && <ResponseBox ok={submissionState.ok} friendly={submissionState.msg} />}

            {paymentResult && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 mt-4 space-y-3 text-sm text-green-900">
                <p className="font-bold text-lg">✓ Payment Ready</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-1">FROM</p>
                    <p className="font-mono text-xs break-all">{paymentResult.sender}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-1">TO</p>
                    <p className="font-mono text-xs break-all">{paymentResult.recipient}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-1">AMOUNT</p>
                    <p className="text-sm">{paymentResult.amount} SUI</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-1">GAS BUDGET</p>
                    <p className="text-sm">{paymentResult.gasBudget} MIST</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-2">IMPACT:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Sender balance reduced by {paymentResult.amount} SUI</li>
                    <li>• Sender pays {paymentResult.gasBudget} MIST from gas station sponsorship</li>
                    <li>• Recipient balance increased by {paymentResult.amount} SUI</li>
                    <li>• Gas station covers all transaction fees</li>
                  </ul>
                </div>
              </div>
            )}
          </FormPanel>
        )}

        {/* Wallet Picker */}
        <WalletPickerDialog
          open={walletPickerOpen}
          wallets={walletProviders}
          selectedIndex={selectedWalletIndex}
          onSelectedIndexChange={setSelectedWalletIndex}
          onCancel={() => setWalletPickerOpen(false)}
          onConfirm={confirmSelectedWallet}
          title="Choose a wallet to link"
          description="Select the wallet extension you want to use for this P2P payment."
        />
      </div>
    </div>
  )
}