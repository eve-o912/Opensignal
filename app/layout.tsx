import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { WalletProvider } from '@/context/WalletContext'

export const metadata: Metadata = {
  title: 'OpenSignal',
  description: 'Gas-free transactions on Sui. Your users never pay.',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-black text-white antialiased">
        <WalletProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </WalletProvider>
      </body>
    </html>
  )
}
