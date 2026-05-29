import { ReactNode } from 'react'

interface Props { value: string; label: string; icon: ReactNode }

export default function KpiTile({ value, label, icon }: Props) {
  return (
    <div className="relative overflow-hidden bg-gray-900 border border-gray-700 rounded-2xl p-4">    
        {icon}
      <p className="text-2xl font-bold text-white relative z-10">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5 relative z-10">{label}</p>
    </div>
  )
}
