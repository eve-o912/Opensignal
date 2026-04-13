const MSG = '⚡ Network live · Avg latency 38ms · 1.24M txns sponsored today · 43.8K SUI in gas covered · 86 active dApps · Last block: 0.3s ago · Policy engine: nominal · '

export default function SignalStrip() {
  return (
    <div className="flex items-center gap-2 px-6 py-1.5 border-b border-white/5 overflow-hidden"
      style={{ backgroundColor: '#042C53' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 animate-pulse" />
      <div className="overflow-hidden flex-1">
        <div className="text-xs text-white/40 whitespace-nowrap"
          style={{ animation: 'marquee 30s linear infinite' }}>
          {MSG + MSG}
        </div>
      </div>
    </div>
  )
}
