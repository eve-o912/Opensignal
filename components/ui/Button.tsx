import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'default' | 'danger' | 'sm'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const base = 'font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-white text-black border border-white hover:bg-gray-100 px-5 py-2.5 text-sm rounded-xl',
  default: 'bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 px-5 py-2.5 text-sm rounded-xl',
  danger:  'bg-red-700 text-white border border-red-600 hover:bg-red-800 px-5 py-2.5 text-sm rounded-xl',
  sm:      'bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 px-3.5 py-1.5 text-xs rounded-lg',
}

export default function Button({ variant = 'default', children, className = '', ...props }: Props) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
