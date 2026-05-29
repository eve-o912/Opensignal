'use client'

import Button from '@/components/ui/Button'
import { InjectedWalletProvider } from '@/lib/wallet'

interface WalletPickerDialogProps {
  open: boolean
  wallets: InjectedWalletProvider[]
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  onCancel: () => void
  onConfirm: () => void
  title?: string
  description?: string
}

export default function WalletPickerDialog({
  open,
  wallets,
  selectedIndex,
  onSelectedIndexChange,
  onCancel,
  onConfirm,
  title = 'Choose a wallet',
  description = 'Select which detected wallet to use for this action.',
}: WalletPickerDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>

        <div className="mt-4 space-y-2">
          {wallets.map((wallet, index) => {
            const active = index === selectedIndex
            const label = wallet.name?.trim() || `Wallet ${index + 1}`
            const details = wallet.accounts?.[0]?.address || wallet.version || ''

            return (
              <button
                key={`${label}-${index}`}
                type="button"
                onClick={() => onSelectedIndexChange(index)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${active ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{label}</div>
                  <div className="text-xs text-slate-500">{details || 'Detected wallet extension'}</div>
                </div>
                <div className={`h-4 w-4 rounded-full border ${active ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`} />
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="default" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>Use selected wallet</Button>
        </div>
      </div>
    </div>
  )
}