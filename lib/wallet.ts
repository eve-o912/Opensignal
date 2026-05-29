import { getWallets } from '@mysten/wallet-standard'

export interface InjectedWalletProvider {
  name?: string
  icon?: string
  version?: string
  chains?: string[]
  features?: Record<string, unknown>
  accounts?: Array<{ address?: string; chains?: string[]; features?: string[] }>
  connect?: (args?: Record<string, unknown>) => Promise<{ accounts?: Array<WalletConnectAccount> }>
  getAccounts?: () => Promise<Array<{ address?: string }>>
  signMessage?: (input: Record<string, unknown>) => Promise<{ signature?: string }>
  signTransaction?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
  signTransactionBlock?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
}

export interface WalletAccount {
  address: string
  chains?: string[]
  features?: string[]
}

interface WalletConnectAccount {
  address?: string
  chains?: string[]
  features?: string[]
}

/**
 * Reads all currently registered Wallet Standard wallets.
 * This is the official way — works for Slush, Sui Wallet, and any
 * other extension that calls registerWallet() on load.
 */
export function getInjectedWalletProviders(): InjectedWalletProvider[] {
  if (typeof window === 'undefined') return []

  try {
    const wallets = getWallets().get()
    return wallets as unknown as InjectedWalletProvider[]
  } catch {
    return []
  }
}

export function getInjectedWalletNames(): string[] {
  return getInjectedWalletProviders()
    .map((w) => w.name?.trim() || 'Sui wallet')
}

/**
 * Waits up to timeoutMs for at least one Wallet Standard wallet to appear.
 * Listens for the register event so detection is instant when the extension
 * injects after page load (common on deployed origins).
 */
export function waitForInjectedWalletProviders(timeoutMs = 3000): Promise<InjectedWalletProvider[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve([])
      return
    }

    const walletsApi = getWallets()

    // Already registered before we got here
    const current = walletsApi.get() as unknown as InjectedWalletProvider[]
    if (current.length > 0) {
      resolve(current)
      return
    }

    let settled = false

    function finish() {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      unsubscribe()
      resolve(walletsApi.get() as unknown as InjectedWalletProvider[])
    }

    // The Wallet Standard fires this every time a wallet calls registerWallet()
    const unsubscribe = walletsApi.on('register', () => {
      // Small tick so the wallet finishes its own setup
      setTimeout(finish, 50)
    })

    const timeoutId = window.setTimeout(finish, timeoutMs)
  })
}

/**
 * Given a provider, returns all available signing functions to try in order.
 */
export function getWalletSigners(
  provider: InjectedWalletProvider
): Array<(input: Record<string, unknown>) => Promise<Record<string, unknown>>> {
  const features = (provider.features ?? {}) as Record<string, unknown>

  const featureSignTx = (
    features['sui:signTransaction'] as
      | { signTransaction?: (i: Record<string, unknown>) => Promise<Record<string, unknown>> }
      | undefined
  )?.signTransaction

  const featureSignTxBlock = (
    features['sui:signTransactionBlock'] as
      | { signTransactionBlock?: (i: Record<string, unknown>) => Promise<Record<string, unknown>> }
      | undefined
  )?.signTransactionBlock

  return [
    featureSignTx,
    provider.signTransaction,
    featureSignTxBlock,
    provider.signTransactionBlock,
  ].filter((fn): fn is (input: Record<string, unknown>) => Promise<Record<string, unknown>> => typeof fn === 'function')
}

/**
 * Given a provider, returns the signPersonalMessage function if available.
 */
export function getWalletMessageSigner(
  provider: InjectedWalletProvider
): ((input: Record<string, unknown>) => Promise<{ signature?: string }>) | undefined {
  const features = (provider.features ?? {}) as Record<string, unknown>

  // Modern Wallet Standard key
  const modernFeature = features['sui:signPersonalMessage'] as
    | { signPersonalMessage?: (i: Record<string, unknown>) => Promise<{ signature?: string }> }
    | undefined

  // Legacy key used by older builds
  const legacyFeature = features['sui:signMessage'] as
    | { signMessage?: (i: Record<string, unknown>) => Promise<{ signature?: string }> }
    | undefined

  return modernFeature?.signPersonalMessage ?? legacyFeature?.signMessage ?? provider.signMessage
}

/**
 * Given a provider, calls standard:connect and returns the first connected account.
 */
export async function connectWalletAndGetAccount(
  provider: InjectedWalletProvider
): Promise<WalletAccount> {
  const features = (provider.features ?? {}) as Record<string, unknown>
  const connectFeature = features['standard:connect'] as
    | { connect?: (args?: Record<string, unknown>) => Promise<{ accounts?: Array<WalletConnectAccount> }> }
    | undefined

  const connectFn = connectFeature?.connect ?? provider.connect

  let account: WalletAccount | undefined

  try {
    const result = await connectFn?.({})
    const connected = result?.accounts?.[0]
    if (connected?.address) {
      account = {
        address: connected.address,
        chains: connected.chains,
        features: connected.features,
      }
    }
  } catch {
    // fallback: try already-authorized accounts
    const fallback = provider.accounts?.[0]
    if (fallback?.address) {
      account = {
        address: fallback.address,
        chains: fallback.chains,
        features: fallback.features,
      }
    }
  }

  if (!account) {
    // last resort: getAccounts
    const accounts = await provider.getAccounts?.()
    const lastResort = accounts?.[0]
    if (lastResort?.address) {
      account = {
        address: lastResort.address,
      }
    }
  }

  if (!account) {
    throw new Error('Wallet did not return an account address.')
  }

  return account
}

/**
 * Given a provider, calls standard:connect and returns the first account address.
 */
export async function connectWalletAndGetAddress(
  provider: InjectedWalletProvider
): Promise<string> {
  const account = await connectWalletAndGetAccount(provider)
  return account.address
}