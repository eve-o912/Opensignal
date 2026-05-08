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

type WindowWithWallets = Window & {
  getWallets?: () => unknown
  wallets?: unknown
  suiWallet?: unknown
  slushWallet?: unknown
  wallet?: unknown
  walletStandard?: WalletRegistry
  __wallet_standard__?: WalletRegistry
}

function isWalletProvider(candidate: unknown): candidate is InjectedWalletProvider {
  if (!candidate || typeof candidate !== 'object') return false

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

function probeRegistry(target: InjectedWalletProvider[], registry: unknown): void {
  if (!registry || typeof registry !== 'object') return
  const reg = registry as WalletRegistry
  try {
    collectProviders(target, typeof reg.get === 'function' ? reg.get() : null)
  } catch {
    // ignore registry errors
  }
  collectProviders(target, reg.wallets)
}

export function getInjectedWalletProviders(): InjectedWalletProvider[] {
  if (typeof window === 'undefined') return []

  const providers: InjectedWalletProvider[] = []
  const win = window as WindowWithWallets

  // 1. Wallet Standard registry — primary path for Slush and modern Sui wallets.
  //    Slush registers under window.__wallet_standard__ and fires
  //    'wallet-standard:register-wallet' when it injects.
  probeRegistry(providers, win.__wallet_standard__)

  // 2. Wallet Standard under the non-underscored key (some older builds).
  probeRegistry(providers, win.walletStandard)

  // 3. Global getWallets() factory (used by some wallet aggregators).
  try {
    collectProviders(providers, typeof win.getWallets === 'function' ? win.getWallets() : null)
  } catch {
    // ignore
  }

  // 4. window.wallets array or registry.
  probeRegistry(providers, win.wallets)
  collectProviders(providers, win.wallets)

  // 5. navigator.wallets (Payment Handler API-adjacent pattern).
  const navWallets = (window.navigator as Navigator & { wallets?: unknown }).wallets
  probeRegistry(providers, navWallets)
  collectProviders(providers, navWallets)

  // 6. Legacy / direct injection fallbacks.
  collectProviders(providers, win.suiWallet)
  collectProviders(providers, win.slushWallet)
  collectProviders(providers, win.wallet)

  return providers
}

export function getInjectedWalletNames(): string[] {
  return getInjectedWalletProviders()
    .map((provider) => provider.name?.trim() || 'Sui wallet')
}


export function waitForInjectedWalletProviders(timeoutMs = 3000): Promise<InjectedWalletProvider[]> {
  return new Promise((resolve) => {
    const check = () => getInjectedWalletProviders()

    const current = check()
    if (current.length > 0) {
      resolve(current)
      return
    }

    let settled = false

    function finish() {
      if (settled) return
      settled = true
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      window.removeEventListener('wallet-standard:register-wallet', onRegister)
      resolve(check())
    }

    function onRegister() {
      // Give the wallet a tick to finish registering before we read it.
      setTimeout(finish, 50)
    }

    window.addEventListener('wallet-standard:register-wallet', onRegister)

    // Poll as a safety net in case the event already fired before we listened.
    const intervalId = window.setInterval(() => {
      if (check().length > 0) finish()
    }, 100)

    // Hard timeout — resolve with whatever we have (may be empty).
    const timeoutId = window.setTimeout(finish, timeoutMs)
  })
}