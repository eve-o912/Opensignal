import { SponsorEvent } from '@/types'

interface Props { events: SponsorEvent[]; isDemo?: boolean }

export default function ActivityTable({ events, isDemo }: Props) {
  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-5">
      <p className="text-sm font-semibold text-blue-900 mb-4">Recent activity</p>

      {isDemo && (
        <p className="text-xs text-blue-300 mb-3">Sign in to see your live activity</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['Time', 'App', 'Wallet', 'Gas used', 'Result'].map((h) => (
                <th key={h} className="text-left px-2 py-1.5 text-xs text-blue-400 font-medium border-b border-blue-50 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => {
              const ok  = ev.status !== 'failed'
              const gas = ev.gasBudget ?? ev.gas
              const demoEv = ev as { t?: string; d?: string; s?: string; g?: string }
              const time = ev.createdAt
                ? new Date(ev.createdAt).toLocaleTimeString()
                : demoEv.t ?? '—'

              return (
                <tr key={i} className="border-b border-blue-50 last:border-b-0">
                  <td className="px-2 py-2 text-blue-900">{time}</td>
                  <td className="px-2 py-2 text-blue-900">{ev.dappId ?? ev.dapp ?? demoEv.d ?? '—'}</td>
                  <td className="px-2 py-2 font-mono text-xs text-blue-900">
                    {(ev.sender ?? demoEv.s ?? '—').slice(0, 14)}
                  </td>
                  <td className="px-2 py-2 text-blue-900">
                    {gas != null ? `${gas.toLocaleString()} MIST` : demoEv.g ?? '—'}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${ok ? 'bg-teal-500' : 'bg-red-500'}`} />
                    <span className={ok ? 'text-teal-700' : 'text-red-600'}>{ok ? 'Approved' : 'Rejected'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
