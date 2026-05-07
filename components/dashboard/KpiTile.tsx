import { ReactNode } from 'react'

interface Props { value: string; label: string; icon: ReactNode }

export default function KpiTile({ value, label, icon }: Props) {
  return (
    <div className="relative overflow-hidden bg-gray-900 border border-gray-700 rounded-2xl p-4">
      <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full bg-gray-800 opacity-60" />
      <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center z-10 text-gray-400">
        {icon}
      </div>
      <p className="text-2xl font-bold text-white relative z-10">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5 relative z-10">{label}</p>
    </div>
  )
}
