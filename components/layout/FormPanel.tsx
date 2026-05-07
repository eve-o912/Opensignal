import { ReactNode } from 'react'

interface Props {
  step?: number | string
  title: string
  desc?: string
  children: ReactNode
  className?: string
}

export default function FormPanel({ step, title, desc, children, className = '' }: Props) {
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-3.5 ${className}`}>
      {(step != null || title) && (
        <div className="flex items-start gap-3 mb-4">
          {step != null && (
            <div className="w-7 h-7 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {step}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            {desc && <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{desc}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
