'use client'

import LogoGem from './LogoGem'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/context/AuthContext'

interface Props {
  activePage: string
  onNav: (page: string) => void
  onMenuToggle?: () => void
}

export default function TopNav({ activePage, onNav, onMenuToggle }: Props) {
  const { jwt } = useAuth()

  return (
    <nav className="flex items-center justify-between px-6 h-14 border-b border-white/10 sticky top-0 z-10"
      style={{ backgroundColor: '#042C53' }}>
      <div className="flex items-center gap-2.5 text-white text-base font-semibold">
        <button
          onClick={onMenuToggle}
          aria-label="Open menu"
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/20 text-blue-200 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
        </button>
        <LogoGem />
        OpenSignal
      </div>
      <div className="hidden md:flex items-center gap-2.5">
        {['dashboard', 'account'].map((p) => (
          <button
            key={p}
            onClick={() => onNav(p)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors capitalize cursor-pointer ${
              activePage === p
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-white/20 text-blue-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
        <span className="text-xs ml-1">
          {jwt ? <Badge variant="ok">Signed in</Badge> : <span className="text-white/40">Not signed in</span>}
        </span>
      </div>
    </nav>
  )
}
