'use client'

import Image from 'next/image'
import Button from '@/components/ui/Button'
import Logo from '../../public/logo1.png'

interface LandingPageProps {
  onSignUp: () => void
  onSignIn: () => void
}

export default function LandingPage({ onSignUp, onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src={Logo} alt="OpenSignal Logo" width={40} height={40} />
          <h1 className="text-2xl font-bold">OpenSignal</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-2xl text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
              Gas-Free Transactions
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 mb-6">
              Eliminate gas complexity from your users' experience. OpenSignal sponsors blockchain transactions on Sui.
            </p>
          </div>

          {/* Feature List */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-12">
            <h3 className="text-lg font-semibold mb-6 text-white">Why OpenSignal?</h3>
            <ul className="space-y-4 text-left">
              <li className="flex items-start gap-3">
                <span className="text-xl text-white">✓</span>
                <span className="text-gray-300">
                  <strong>Zero Friction:</strong> Users never pay gas fees. Your application sponsors transactions seamlessly.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl text-white">✓</span>
                <span className="text-gray-300">
                  <strong>Policy Control:</strong> Set transaction limits, allowlists, and budgets per app to prevent abuse.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl text-white">✓</span>
                <span className="text-gray-300">
                  <strong>Real-Time Dashboard:</strong> Monitor sponsorship metrics and activity in real-time across all your apps.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl text-white">✓</span>
                <span className="text-gray-300">
                  <strong>Simple API:</strong> Integrate with just an API key. Check, sign, and sponsor transactions with one endpoint.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl text-white">✓</span>
                <span className="text-gray-300">
                  <strong>Sui Native:</strong> Built for Sui blockchain. Leverage testnet and mainnet with dedicated API keys per app.
                </span>
              </li>
            </ul>
          </div>

          {/* Technical Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-2">86</div>
              <p className="text-sm text-gray-400">Active dApps</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-2">1.24M</div>
              <p className="text-sm text-gray-400">Txns Sponsored Today</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-2">43.8K</div>
              <p className="text-sm text-gray-400">SUI in Gas Covered</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              onClick={onSignUp}
              className="!px-8 !py-3 !text-base"
            >
              Get Started
            </Button>
            <Button
              variant="default"
              onClick={onSignIn}
              className="!px-8 !py-3 !text-base"
            >
              Sign In
            </Button>
          </div>

          {/* Footer Text */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-500">
              OpenSignal uses JWT authentication and policy engine validation to secure all transactions.
            </p>
            <p className="text-xs text-gray-600 mt-4">
              On Sui blockchain • Testnet & Mainnet • No credit card required
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
