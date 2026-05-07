import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  dark?: boolean
}

export default function Card({ children, className = '', dark = false }: Props) {
  if (dark) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-[18px] p-5 text-white ${className}`}>
        {children}
      </div>
    )
  }
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-[18px] p-5 text-white ${className}`}>
      {children}
    </div>
  )
}
