interface Props {
  ok: boolean
  friendly?: string
  raw?: Record<string, unknown>
}

export default function ResponseBox({ ok, friendly, raw }: Props) {
  if (!friendly && raw === undefined) return null

  if (friendly) {
    return (
      <div className={`mt-2.5 rounded-xl px-3.5 py-3 text-sm border ${
        ok ? 'bg-gray-900 border-green-700 text-green-100' : 'bg-gray-900 border-red-700 text-red-100'
      }`}>
        {friendly}
      </div>
    )
  }

  const text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)
  return (
    <pre className={`mt-2.5 rounded-xl px-3.5 py-3 text-xs font-mono whitespace-pre-wrap break-all max-h-44 overflow-y-auto border ${
      ok ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-gray-900 border-red-700 text-red-100'
    }`}>
      {text}
    </pre>
  )
}
