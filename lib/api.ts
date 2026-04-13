const DEFAULT_BASE = 'https://api.opensignal.xyz'

function getBase(): string {
  if (typeof window === 'undefined') return DEFAULT_BASE
  const stored = localStorage.getItem('os_base_url')
  return stored ? stored.replace(/\/$/, '') : DEFAULT_BASE
}

interface CallResult<T = unknown> {
  ok: boolean
  status: number
  data: T
}

export async function apiCall<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  jwt?: string | null,
  apiKey?: string
): Promise<CallResult<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  if (apiKey) headers['x-api-key'] = apiKey

  try {
    const res = await fetch(getBase() + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({ error: 'Non-JSON response' }))
    return { ok: res.ok, status: res.status, data: json }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    return { ok: false, status: 0, data: { error: msg } as T }
  }
}

export function seedSpark(n: number, base: number, variance: number): number[] {
  return Array.from({ length: n }, (_, i) =>
    Math.round(base + Math.sin(i * 0.7) * variance + Math.random() * variance * 0.3)
  )
}

export function sparkLabels(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - n + 1 + i)
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  })
}
