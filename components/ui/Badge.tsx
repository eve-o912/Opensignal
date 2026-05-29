import { ReactNode } from 'react'

type Variant = 'ok' | 'err' | 'warn'

const styles: Record<Variant, string> = {
  ok:   'bg-green-900 text-green-100 border border-green-700',
  err:  'bg-red-900 text-red-100 border border-red-700',
  warn: 'bg-amber-900 text-amber-100 border border-amber-700',
}

export default function Badge({ variant, children }: { variant: Variant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium ${styles[variant]}`}>
      {children}
    </span>
  )
}
