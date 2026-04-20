function resolveDefaultBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE
  if (configured) return configured.replace(/\/$/, '')

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:10000'
  }

  return 'https://opensignal.onrender.com'
}

const DEFAULT_BASE = resolveDefaultBase()

function normalizeBase(base: string): string {
  const trimmed = base.trim()
  return trimmed.replace(/\/$/, '')
}

function getBase(): string {
  if (typeof window === 'undefined') return DEFAULT_BASE
  const stored = localStorage.getItem('os_base_url')
  return stored ? normalizeBase(stored) : DEFAULT_BASE
}

export function getApiErrorMessage(data: unknown, fallback = 'Request failed'): string {
  if (!data || typeof data !== 'object') return fallback
  const record = data as Record<string, unknown>
  const directError = record.error

  if (typeof directError === 'string') return directError
  if (directError && typeof directError === 'object') {
    const nested = directError as Record<string, unknown>
    if (typeof nested.message === 'string') return nested.message
  }
  if (typeof record.message === 'string') return record.message
  return fallback
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
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  if (apiKey) headers['x-api-key'] = apiKey

  async function call(base: string): Promise<CallResult<T>> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(base + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      const json = await res.json().catch(() => ({ error: 'Non-JSON response' }))
      return { ok: res.ok, status: res.status, data: json }
    } finally {
      clearTimeout(timeout)
    }
  }

  const base = getBase()

  try {
    return await call(base)
  } catch (e) {
    if (base !== DEFAULT_BASE) {
      try {
        return await call(DEFAULT_BASE)
      } catch {
        // Fall through to generic network error below.
      }
    }
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
