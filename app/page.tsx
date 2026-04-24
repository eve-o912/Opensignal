'use client'

import { useState } from 'react'
import TopNav from '@/components/layout/TopNav'
import SignalStrip from '@/components/layout/SignalStrip'
import Sidebar from '@/components/layout/Sidebar'
import HeroCanvas from '@/components/dashboard/HeroCanvas'
import DashboardPage from '@/components/pages/DashboardPage'
import AccountPage from '@/components/pages/AccountPage'
import AppsPage from '@/components/pages/AppsPage'
import KeysPage from '@/components/pages/KeysPage'
import SponsorPage from '@/components/pages/SponsorPage'
import CheckoutPage from '@/components/pages/CheckoutPage'
import SettingsPage from '@/components/pages/SettingsPage'

type Page = 'dashboard' | 'account' | 'apps' | 'keys' | 'sponsor' | 'checkout' | 'settings'

export default function Home() {
  const [active, setActive] = useState<Page>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const nav = (p: string) => {
    setActive(p as Page)
    setMobileMenuOpen(false)
  }

  function renderPage() {
    switch (active) {
      case 'dashboard': return <DashboardPage />
      case 'account':   return <AccountPage onNavigate={nav} />
      case 'apps':      return <AppsPage />
      case 'keys':      return <KeysPage />
      case 'sponsor':   return <SponsorPage />
      case 'checkout':  return <CheckoutPage />
      case 'settings':  return <SettingsPage />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <TopNav activePage={active} onNav={nav} onMenuToggle={() => setMobileMenuOpen((v) => !v)} />
      <SignalStrip />
      <HeroCanvas />

      <div className="flex flex-1 min-w-0">
        <Sidebar
          active={active}
          onNav={nav}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 min-w-0 px-6 py-8">
          <div
            className={
              active === 'dashboard'
                ? 'w-full'
                : active === 'sponsor'
                  ? 'w-full lg:w-[80%] mx-auto'
                  : 'w-full max-w-3xl mx-auto'
            }
          >
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  )
}
