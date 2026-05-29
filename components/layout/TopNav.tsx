'use client'

import Image from 'next/image'
import Badge from '@/components/ui/Badge'
import ConnectWallet from './ConnectWallet'
import { useAuth } from '@/context/AuthContext'
import Logo from '../../public/logo1.png'

interface Props {
  activePage: string
  onNav: (page: string) => void
  onMenuToggle?: () => void
}

export default function TopNav({ activePage, onNav, onMenuToggle }: Props) {
  const { jwt } = useAuth()

  return (
    <nav className="bg-black flex items-center justify-between px-6 h-14 border-b border-white/20 sticky top-0 z-10 shadow-md">
      <div className="flex items-center gap-2.5 text-white text-base font-semibold">
        <button
          type="button"
          className="md:hidden mr-2 text-white/80"
          onClick={() => onMenuToggle?.()}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        
        <Image src={Logo} alt="OpenSignal Logo" width={50} height={50}/>
        <h1 className='font-semibold text-xl text-white'>Open<span className='text-[#53C7ED]'>Signal</span>
          </h1>
      </div>
      <div className="hidden md:flex items-center gap-3">
        {jwt && (
          <>
            {['dashboard'].map((p) => (
              <button
                key={p}
                onClick={() => onNav(p)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors capitalize cursor-pointer ${
                  activePage === p
                    ? 'bg-white border-white text-black'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </>
        )}
        
        <ConnectWallet />
      </div>
    </nav>
  )
}
