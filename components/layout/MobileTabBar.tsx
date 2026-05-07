'use client'

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'account',   label: 'Account' },
  { id: 'apps',      label: 'Apps' },
  { id: 'keys',      label: 'Keys' },
  { id: 'sponsor',   label: 'Sponsor' },
  { id: 'checkout',  label: 'Checkout' },
  { id: 'settings',  label: 'Settings' },
]

interface Props { active: string; onNav: (id: string) => void }

export default function MobileTabBar({ active, onNav }: Props) {
  return (
    <div className="flex md:hidden gap-1 px-3 py-2.5 bg-gray-950 border-b border-gray-800 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onNav(t.id)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
            active === t.id ? 'bg-white text-black' : 'text-gray-400 hover:bg-gray-900 hover:text-white'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
