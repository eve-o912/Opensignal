import { ReactNode } from 'react'

export default function InfoPill({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-3 text-sm text-blue-700 mb-3.5">
      <svg className="w-4 h-4 stroke-blue-500 fill-none shrink-0 mt-0.5" strokeWidth="2" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" />
        <path d="M8 7v5M8 5v.5" strokeLinecap="round" />
      </svg>
      <span>{children}</span>
    </div>
  )
}
