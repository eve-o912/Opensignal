import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'default' | 'danger' | 'sm'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const base = 'font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-blue-700 text-white border border-blue-700 hover:bg-blue-900 px-5 py-2.5 text-sm rounded-xl',
  default: 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-5 py-2.5 text-sm rounded-xl',
  danger:  'bg-white text-red-700 border border-red-200 hover:bg-red-50 px-5 py-2.5 text-sm rounded-xl',
  sm:      'bg-white text-blue-500 border border-blue-200 hover:bg-blue-50 px-3.5 py-1.5 text-xs rounded-lg',
}

export default function Button({ variant = 'default', children, className = '', ...props }: Props) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
