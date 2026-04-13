export default function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-blue-400 mt-2.5">
      <span className="inline-block w-3.5 h-3.5 border-2 border-blue-100 border-t-blue-600 rounded-full"
        style={{ animation: 'spin 0.6s linear infinite' }} />
      {label}
    </div>
  )
}
