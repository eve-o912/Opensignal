export interface InjectedWalletProvider {
  name?: string
  icon?: string
  features?: Record<string, unknown>
  accounts?: Array<{ address?: string }>
  connect?: (args?: Record<string, unknown>) => Promise<{ accounts?: Array<{ address?: string; chains?: string[] }> }>
  getAccounts?: () => Promise<Array<{ address?: string }>>
  signMessage?: (input: Record<string, unknown>) => Promise<{ signature?: string }>
  signTransaction?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
  signTransactionBlock?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
}

type WalletRegistry = {
  get?: () => unknown
  wallets?: unknown
}

function isWalletProvider(candidate: unknown): candidate is InjectedWalletProvider {
  if (!candidate || typeof candidate !== 'object') {
    return false
  }

  const provider = candidate as InjectedWalletProvider & { features?: Record<string, unknown> }
  return Boolean(
    provider.connect ||
    provider.getAccounts ||
    provider.signMessage ||
    provider.signTransaction ||
    provider.signTransactionBlock ||
    provider.features,
  )
}

function collectProviders(target: InjectedWalletProvider[], source: unknown): void {
  if (!source) return

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (isWalletProvider(entry) && !target.includes(entry)) {
        target.push(entry)
      }
    }
    return
  }

  if (isWalletProvider(source) && !target.includes(source)) {
    target.push(source)
  }
}

export function getInjectedWalletProviders(): InjectedWalletProvider[] {
  if (typeof window === 'undefined') return []

  const providers: InjectedWalletProvider[] = []
  const win = window as Window & {
    getWallets?: () => unknown
    wallets?: unknown
    suiWallet?: unknown
    slushWallet?: unknown
    wallet?: unknown
    walletStandard?: WalletRegistry
  }

  try {
    collectProviders(providers, typeof win.getWallets === 'function' ? win.getWallets() : null)
  } catch {
    // Ignore wallet registry errors and continue with other discovery paths.
  }

  collectProviders(providers, win.wallets)

  const navigatorWallets = (window.navigator as Navigator & { wallets?: WalletRegistry | unknown[] }).wallets
  if (navigatorWallets) {
    if (typeof navigatorWallets === 'object' && navigatorWallets !== null) {
      const registry = navigatorWallets as WalletRegistry
      try {
        collectProviders(providers, typeof registry.get === 'function' ? registry.get() : null)
      } catch {
        // Keep probing other locations.
      }
      collectProviders(providers, registry.wallets)
    } else {
      collectProviders(providers, navigatorWallets)
    }
  }

  collectProviders(providers, win.suiWallet)
  collectProviders(providers, win.slushWallet)
  collectProviders(providers, win.wallet)

  return providers
}

export function getInjectedWalletNames(): string[] {
  return getInjectedWalletProviders()
    .map((provider) => provider.name?.trim() || 'Sui wallet')
}