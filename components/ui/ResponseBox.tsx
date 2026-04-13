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
        ok ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        {friendly}
      </div>
    )
  }

  const text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)
  return (
    <pre className={`mt-2.5 rounded-xl px-3.5 py-3 text-xs font-mono whitespace-pre-wrap break-all max-h-44 overflow-y-auto border ${
      ok ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      {text}
    </pre>
  )
}
