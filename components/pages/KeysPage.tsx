'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { apiCall, getApiErrorMessage } from '@/lib/api'
import { ApiKey } from '@/types'
import SectionHeader from '@/components/layout/SectionHeader'
import FormPanel from '@/components/layout/FormPanel'
import InfoPill from '@/components/ui/InfoPill'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ResponseBox from '@/components/ui/ResponseBox'
import Spinner from '@/components/ui/Spinner'

interface StoredSecrets {
  [keyId: string]: string
}

function readStoredSecrets(): StoredSecrets {
  if (typeof window === 'undefined') return {}
  const raw = localStorage.getItem('os_generated_key_secrets')
  if (!raw) return {}

  try {
    return JSON.parse(raw) as StoredSecrets
  } catch {
    return {}
  }
}

function writeStoredSecrets(next: StoredSecrets) {
  if (typeof window === 'undefined') return
  localStorage.setItem('os_generated_key_secrets', JSON.stringify(next))
}

export default function KeysPage() {
  const { jwt } = useAuth()
  const { show } = useToast()

  const [apps,     setApps]     = useState<Array<{ id: string; name: string }>>([])
  const [selectedAppId, setSelectedAppId] = useState('')
  const [keyName,  setKeyName]  = useState('')
  const [creating, setCreating] = useState(false)
  const [createState, setCreateState] = useState<{ ok: boolean; msg: string } | null>(null)
  const [latestSecret, setLatestSecret] = useState<{ keyId: string; secret: string } | null>(null)
  const [storedSecrets, setStoredSecrets] = useState<StoredSecrets>({})
  const [keys,     setKeys]     = useState<ApiKey[]>([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    setStoredSecrets(readStoredSecrets())
  }, [])

  const loadApps = useCallback(async () => {
    if (!jwt) return
    const r = await apiCall<{ apps?: Array<{ id: string; name: string }> }>('GET', '/v1/portal/apps', undefined, jwt)
    if (!r.ok) return

    const appList = r.data.apps ?? []
    setApps(appList)
    setSelectedAppId((prev) => prev || appList[0]?.id || '')
  }, [jwt])

  const loadKeys = useCallback(async () => {
    if (!jwt || !selectedAppId) {
      setKeys([])
      return
    }

    setLoading(true)
    const r = await apiCall<{ apiKeys?: Array<{ id: string; label?: string | null; keyPrefix: string; status: string; createdAt?: string }> }>(
      'GET',
      `/v1/portal/apps/${encodeURIComponent(selectedAppId)}/api-keys`,
      undefined,
      jwt
    )
    setLoading(false)
    if (!r.ok) return

    const mapped: ApiKey[] = (r.data.apiKeys ?? []).map((k) => ({
      id: k.id,
      name: k.label ?? 'Unnamed key',
      key: k.keyPrefix,
      dappId: selectedAppId,
      revoked: k.status === 'REVOKED',
      createdAt: k.createdAt,
    }))
    setKeys(mapped)
  }, [jwt, selectedAppId])

  useEffect(() => { loadApps() }, [loadApps])

  useEffect(() => { loadKeys() }, [loadKeys])

  async function doCreate() {
    if (!selectedAppId) return
    setCreating(true); setCreateState(null); setLatestSecret(null)
    const r = await apiCall<{ secret?: string; apiKey?: { id: string } }>(
      'POST',
      `/v1/portal/apps/${encodeURIComponent(selectedAppId)}/api-keys`,
      { label: keyName || undefined },
      jwt
    )
    setCreating(false)
    if (r.ok) {
      const createdSecret = r.data.secret
      const createdKeyId = r.data.apiKey?.id

      if (createdSecret && createdKeyId) {
        const nextSecrets = {
          ...storedSecrets,
          [createdKeyId]: createdSecret,
        }
        setStoredSecrets(nextSecrets)
        writeStoredSecrets(nextSecrets)
        setLatestSecret({ keyId: createdKeyId, secret: createdSecret })
      }

      setCreateState({
        ok: true,
        msg: createdSecret
          ? 'Key created successfully. Use the copy button to store it safely.'
          : "Key created! Copy it now — it won't be shown in full again.",
      })
      setKeyName('')
      loadKeys()
    } else {
      setCreateState({ ok: false, msg: getApiErrorMessage(r.data, "Couldn't create key. Check you're signed in and app access is valid.") })
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this key? It will stop working immediately.')) return
    await apiCall('POST', `/v1/portal/api-keys/${encodeURIComponent(id)}/revoke`, {}, jwt)

    if (storedSecrets[id]) {
      const nextSecrets = { ...storedSecrets }
      delete nextSecrets[id]
      setStoredSecrets(nextSecrets)
      writeStoredSecrets(nextSecrets)
    }

    show('Key revoked')
    loadKeys()
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret)
      show('Key copied to clipboard')
    } catch {
      show('Copy failed. Copy manually from the key box.')
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Security"
        title="API keys"
        sub="Each key lets one of your apps talk to OpenSignal. Keep them secret and revoke any you're not using."
      />

      <InfoPill>
        When you generate a new key, copy it immediately. For security, you will not be able to see the full key again after closing this page.
      </InfoPill>

      <FormPanel title="Create a new key">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Input label="Key nickname" placeholder="e.g. Production key"
            value={keyName} onChange={(e) => setKeyName(e.target.value)}
            hint="A label just for you" />
          <label className="text-xs font-semibold text-blue-700 flex flex-col gap-1.5">
            Which app is this for?
            <select
              className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              disabled={!apps.length}
            >
              {!apps.length && <option value="">No apps available</option>}
              {apps.map((app) => (
                <option key={app.id} value={app.id}>{app.name} ({app.id})</option>
              ))}
            </select>
          </label>
        </div>
        <Button variant="primary" onClick={doCreate} disabled={creating || !selectedAppId}>
          {creating ? 'Generating…' : 'Generate key'}
        </Button>
        {createState && <ResponseBox ok={createState.ok} friendly={createState.msg} />}
        {latestSecret && (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-900 mb-2">New key secret</p>
            <p className="font-mono text-xs text-blue-800 break-all mb-3">{latestSecret.secret}</p>
            <Button variant="sm" onClick={() => copySecret(latestSecret.secret)}>Copy key</Button>
          </div>
        )}
      </FormPanel>

      <FormPanel title="Your keys">
        <div className="flex justify-end mb-3">
          <Button variant="sm" onClick={loadKeys}>Refresh</Button>
        </div>
        {!jwt    && <p className="text-sm text-blue-400">Sign in to view your keys</p>}
        {jwt && loading && <Spinner label="Loading your keys…" />}
        {jwt && !loading && keys.length === 0 && (
          <p className="text-sm text-blue-400">No keys yet — create one above.</p>
        )}
        <div className="divide-y divide-blue-50">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between py-3 gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-sm text-blue-900">{k.name ?? 'Unnamed key'}</p>
                <p className="font-mono text-xs text-blue-600 mt-0.5">{k.key ?? k.id}</p>
                {storedSecrets[k.id] && (
                  <div className="mt-2">
                    <Button variant="sm" onClick={() => copySecret(storedSecrets[k.id])}>Copy full key</Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={k.revoked ? 'err' : 'ok'}>
                  {k.revoked ? 'Revoked' : 'Active'}
                </Badge>
                {!k.revoked && (
                  <Button variant="danger" onClick={() => revokeKey(k.id)}
                    className="!text-xs !px-3 !py-1.5 !rounded-lg">
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </FormPanel>
    </div>
  )
}
