'use client'

import Image from 'next/image'
import LogoGem from './LogoGem'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import Logo from '../../public/logo.png'

interface Props {
  activePage: string
  onNav: (page: string) => void
  onMenuToggle?: () => void
}

export default function TopNav({ activePage, onNav, onMenuToggle }: Props) {
  const { jwt, setJwt } = useAuth()

  function handleLogout() {
    setJwt(null)
  }

  return (
    <nav className="flex items-center justify-between px-6 h-14 border-b border-white sticky top-0 z-10">
      <div className="flex items-center gap-2.5 text-white text-base font-semibold">
        
        <Image src={Logo} alt="OpenSignal Logo" width={50} height={50}/>
        <h1 className='font-semibold text-xl text-black'>Open<span className='text-[#2393CF]'>Signal</span>
          </h1>
      </div>
      <div className="hidden md:flex items-center rounded-xl py-2 px-1 gap-2.5">
        <span className="text-sm text-black ml-1">
          {jwt ? (
            <div className="flex items-center gap-2.5">
              <Badge variant="ok">Signed in</Badge>
              <Button 
                variant="sm" 
                onClick={handleLogout}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
              >
                Logout
              </Button>
            </div>
          ) : (
            <span className="text-black">Not signed in</span>
          )}
        </span>
      </div>
      <div className="md:hidden flex items-center gap-2">
        {jwt && (
          <Button 
            variant="sm" 
            onClick={handleLogout}
            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs"
          >
            Logout
          </Button>
        )}
      </div>
    </nav>
  )
}
