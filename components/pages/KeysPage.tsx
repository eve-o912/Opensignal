'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { apiCall } from '@/lib/api'
import { ApiKey } from '@/types'
import SectionHeader from '@/components/layout/SectionHeader'
import FormPanel from '@/components/layout/FormPanel'
import InfoPill from '@/components/ui/InfoPill'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ResponseBox from '@/components/ui/ResponseBox'
import Spinner from '@/components/ui/Spinner'

export default function KeysPage() {
  const { jwt } = useAuth()
  const { show } = useToast()

  const [keyName,  setKeyName]  = useState('')
  const [dappId,   setDappId]   = useState('')
  const [creating, setCreating] = useState(false)
  const [createState, setCreateState] = useState<{ ok: boolean; msg: string } | null>(null)
  const [keys,     setKeys]     = useState<ApiKey[]>([])
  const [loading,  setLoading]  = useState(false)

  const loadKeys = useCallback(async () => {
    if (!jwt) return
    setLoading(true)
    const r = await apiCall<ApiKey[] | { keys: ApiKey[] }>('GET', '/v1/keys', undefined, jwt)
    setLoading(false)
    if (r.ok) setKeys(Array.isArray(r.data) ? r.data : (r.data as { keys: ApiKey[] }).keys ?? [])
  }, [jwt])

  useEffect(() => { loadKeys() }, [loadKeys])

  async function doCreate() {
    setCreating(true); setCreateState(null)
    const r = await apiCall('POST', '/v1/keys', { name: keyName, dappId }, jwt)
    setCreating(false)
    if (r.ok) {
      setCreateState({ ok: true, msg: "Key created! Copy it now — it won't be shown in full again." })
      setKeyName(''); setDappId('')
      loadKeys()
    } else {
      setCreateState({ ok: false, msg: (r.data as { error?: string }).error ?? "Couldn't create key. Check you're signed in and the app ID is correct." })
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this key? It will stop working immediately.')) return
    await apiCall('DELETE', `/v1/keys/${id}`, undefined, jwt)
    show('Key revoked')
    loadKeys()
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
          <Input label="Which app is this for?" placeholder="Paste your app ID here"
            value={dappId} onChange={(e) => setDappId(e.target.value)} />
        </div>
        <Button variant="primary" onClick={doCreate} disabled={creating || !keyName || !dappId}>
          {creating ? 'Generating…' : 'Generate key'}
        </Button>
        {createState && <ResponseBox ok={createState.ok} friendly={createState.msg} />}
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
