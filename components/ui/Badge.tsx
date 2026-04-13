import { ReactNode } from 'react'

type Variant = 'ok' | 'err' | 'warn'

const styles: Record<Variant, string> = {
  ok:   'bg-teal-50 text-teal-900 border border-teal-200',
  err:  'bg-red-50 text-red-800 border border-red-200',
  warn: 'bg-amber-50 text-amber-900 border border-amber-200',
}

export default function Badge({ variant, children }: { variant: Variant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium ${styles[variant]}`}>
      {children}
    </span>
  )
}
