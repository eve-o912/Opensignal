import Button from '@/components/ui/Button'

interface BarItem { name: string; value: number; pct: number }
interface Props { bars: BarItem[]; onRefresh: () => void; isDemo?: boolean }

export default function GasBarChart({ bars, onRefresh, isDemo }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-3.5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-white">Gas usage by app</p>
        <Button variant="sm" onClick={onRefresh}>Refresh</Button>
      </div>

      {isDemo && (
        <p className="text-xs text-gray-500 mb-3">Sign in to see your live data</p>
      )}

      {bars.length === 0 ? (
        <p className="text-sm text-gray-400">No app data available yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {bars.map((bar) => (
            <div key={bar.name} className="flex items-center gap-2.5">
              <span className="w-28 text-sm text-gray-300 truncate shrink-0">{bar.name}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${bar.pct}%` }}
                />
              </div>
              <span className="w-11 text-right text-gray-300 font-semibold text-xs shrink-0">
                {bar.value >= 1000000 ? `${(bar.value / 1e6).toFixed(1)}M` : bar.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
