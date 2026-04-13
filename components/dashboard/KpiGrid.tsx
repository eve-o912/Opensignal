import KpiTile from './KpiTile'

interface Props { txns: string; gas: string; dapps: string; keys: string }

const icon = (path: string) => (
  <svg className="w-3.5 h-3.5 stroke-blue-600 fill-none" strokeWidth="2" viewBox="0 0 14 14">
    <path d={path} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function KpiGrid({ txns, gas, dapps, keys }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <KpiTile value={txns} label="Transactions sponsored"
        icon={icon('M7 1l1.5 4h4l-3.3 2.4 1.3 4L7 9 3.5 11.4l1.3-4L1.5 5H5.5z')} />
      <KpiTile value={gas} label="Gas fees covered"
        icon={icon('M7 2v10M3 6l4-4 4 4')} />
      <KpiTile value={dapps} label="Active apps"
        icon={<svg className="w-3.5 h-3.5 stroke-blue-600 fill-none" strokeWidth="2" viewBox="0 0 14 14"><rect x="1" y="3" width="12" height="9" rx="2"/><path d="M5 3V2a1.5 1.5 0 013 0v1" strokeLinecap="round"/></svg>} />
      <KpiTile value={keys} label="API keys"
        icon={<svg className="w-3.5 h-3.5 stroke-blue-600 fill-none" strokeWidth="2" viewBox="0 0 14 14"><circle cx="5" cy="7" r="3.5"/><path d="M9.5 5l3.5 3.5M11 5l2 2" strokeLinecap="round"/></svg>} />
    </div>
  )
}
