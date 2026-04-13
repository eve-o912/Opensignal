import { ReactNode } from 'react'

interface Props { value: string; label: string; icon: ReactNode }

export default function KpiTile({ value, label, icon }: Props) {
  return (
    <div className="relative overflow-hidden bg-white border border-blue-100 rounded-2xl p-4">
      <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full bg-blue-50 opacity-60" />
      <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center z-10 text-blue-600">
        {icon}
      </div>
      <p className="text-2xl font-bold text-blue-900 relative z-10">{value}</p>
      <p className="text-xs text-blue-400 mt-0.5 relative z-10">{label}</p>
    </div>
  )
}
