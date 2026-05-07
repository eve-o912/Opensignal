'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface WalletInfo {
  address: string
  publicKey?: string
}

interface WalletContextType {
  wallet: WalletInfo | null
  isConnecting: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  error: string | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load wallet from localStorage on mount
  useEffect(() => {
    const storedWallet = localStorage.getItem('os_connected_wallet')
    if (storedWallet) {
      try {
        setWallet(JSON.parse(storedWallet))
      } catch {
        localStorage.removeItem('os_connected_wallet')
      }
    }
  }, [])

  async function connectWallet() {
    setIsConnecting(true)
    setError(null)

    try {
      // Check if Sui Wallet is injected
      const suiWalletWindow = window as any
      const walletProvider = suiWalletWindow.suiWallet || suiWalletWindow.getWallets?.()[0]

      if (!walletProvider && !suiWalletWindow.suiWallet) {
        setError('Sui Wallet not found. Please install Sui Wallet extension.')
        setIsConnecting(false)
        return
      }

      // Use the Sui wallet adapter
      const provider = walletProvider || suiWalletWindow.suiWallet
      
      // Connect to wallet
      if (provider.connect) {
        const result = await provider.connect()
        if (result?.accounts && result.accounts.length > 0) {
          const account = result.accounts[0]
          const walletInfo: WalletInfo = {
            address: account.address,
            publicKey: account.publicKey,
          }
          setWallet(walletInfo)
          localStorage.setItem('os_connected_wallet', JSON.stringify(walletInfo))
        }
      } else if (provider.getAccounts) {
        // Fallback for wallets that only expose getAccounts
        const accounts = await provider.getAccounts()
        if (accounts && accounts.length > 0) {
          const walletInfo: WalletInfo = {
            address: accounts[0].address,
            publicKey: accounts[0].publicKey,
          }
          setWallet(walletInfo)
          localStorage.setItem('os_connected_wallet', JSON.stringify(walletInfo))
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(errorMsg)
      console.error('Wallet connection error:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  function disconnectWallet() {
    setWallet(null)
    localStorage.removeItem('os_connected_wallet')
    setError(null)
  }

  return (
    <WalletContext.Provider value={{ wallet, isConnecting, connectWallet, disconnectWallet, error }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
