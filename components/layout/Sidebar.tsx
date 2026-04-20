'use client'

import { ReactNode } from 'react'

interface Item { id: string; label: string; section?: string; icon: ReactNode }

const items: Item[] = [
  { id: 'dashboard', label: 'Dashboard', section: 'Overview',
    icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> },
  { id: 'account', label: 'My account', section: 'Manage',
    icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="5.5" r="3"/><path d="M2 14c0-2.8 2.7-5 6-5s6 2.2 6 5"/></svg> },
  { id: 'apps', label: 'My apps',
    icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="14" height="10" rx="2"/><path d="M5 4V3a2 2 0 014 0v1"/></svg> },
  { id: 'keys', label: 'API keys',
    icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="8" r="4"/><path d="M11 6l4 4M13 6l2 2"/></svg> },
  { id: 'sponsor', label: 'Sponsor a txn', section: 'Transact',
    icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 1l2 4.5h4.5l-3.6 2.6 1.4 4.5L8 10 3.7 12.6l1.4-4.5L1.5 5.5H6z"/></svg> },
  { id: 'checkout', label: 'Checkout',
    icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h10l-1 7H4L3 4z"/><path d="M6 7h4"/></svg> },
  { id: 'settings', label: 'Settings', section: 'System',
    icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/></svg> },
]

interface Props {
  active: string
  onNav: (id: string) => void
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export default function Sidebar({ active, onNav, mobileOpen = false, onCloseMobile }: Props) {
  function renderItems(keyPrefix = '', closeOnClick = false) {
    let lastSection = ''
    return items.map((item) => {
      const showSection = item.section && item.section !== lastSection
      if (item.section) lastSection = item.section
      return (
        <div key={`${keyPrefix}${item.id}`}>
          {showSection && (
            <p className="text-xs tracking-widest uppercase text-blue-300 px-3 pt-3 pb-1">{item.section}</p>
          )}
          <button
            onClick={() => {
              onNav(item.id)
              if (closeOnClick) onCloseMobile?.()
            }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-colors mb-0.5 cursor-pointer ${
              active === item.id
                ? 'bg-blue-700 text-white'
                : 'text-blue-400 hover:bg-blue-50 hover:text-blue-900'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        </div>
      )
    })
  }

  return (
    <>
      <aside className="hidden md:flex flex-col w-52 shrink-0 bg-white border-r border-blue-50 px-2.5 py-4">
        {renderItems()}
      </aside>

      <div className={`md:hidden fixed inset-0 z-40 transition-opacity duration-200 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <button
          aria-label="Close menu"
          onClick={onCloseMobile}
          className="absolute inset-0 bg-slate-900/40"
        />
        <aside className={`relative h-full w-72 max-w-[88vw] bg-white border-r border-blue-50 px-2.5 py-4 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-sm font-semibold text-blue-900">Menu</p>
            <button
              aria-label="Close menu"
              onClick={onCloseMobile}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-500 hover:bg-blue-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {renderItems('mobile-', true)}
        </aside>
      </div>
    </>
  )
}
