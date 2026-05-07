export default function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-white mt-2.5">
      <span className="inline-block w-3.5 h-3.5 border-2 border-gray-600 border-t-white rounded-full"
        style={{ animation: 'spin 0.6s linear infinite' }} />
      {label}
    </div>
  )
}
