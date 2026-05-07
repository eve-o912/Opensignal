'use client'

import { useState } from 'react'
import { useWallet } from '@/context/WalletContext'
import Button from '@/components/ui/Button'

export default function ConnectWallet() {
  const { wallet, isConnecting, connectWallet, disconnectWallet, error } = useWallet()
  const [showDropdown, setShowDropdown] = useState(false)

  if (wallet) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-3 py-1.5 rounded-lg text-xs bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg p-3 z-50">
            <p className="text-xs text-gray-400 mb-2">Connected Wallet</p>
            <p className="text-sm font-mono text-white break-all mb-3">{wallet.address}</p>
            <Button
              variant="danger"
              onClick={() => {
                disconnectWallet()
                setShowDropdown(false)
              }}
              className="!text-xs !px-3 !py-1.5 w-full"
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="primary"
        onClick={connectWallet}
        disabled={isConnecting}
        className="!text-xs !px-3 !py-1.5"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
