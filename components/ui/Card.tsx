import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  dark?: boolean
}

export default function Card({ children, className = '', dark = false }: Props) {
  if (dark) {
    return (
      <div className={`bg-[#042C53] rounded-[18px] p-5 ${className}`}>
        {children}
      </div>
    )
  }
  return (
    <div className={`bg-white border border-blue-100 rounded-[18px] p-5 ${className}`}>
      {children}
    </div>
  )
}
