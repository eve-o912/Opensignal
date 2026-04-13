'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiCall } from '@/lib/api'
import { DApp } from '@/types'
import SectionHeader from '@/components/layout/SectionHeader'
import FormPanel from '@/components/layout/FormPanel'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ResponseBox from '@/components/ui/ResponseBox'
import Spinner from '@/components/ui/Spinner'

export default function AppsPage() {
  const { jwt } = useAuth()
  const [name,     setName]     = useState('')
  const [desc,     setDesc]     = useState('')
  const [maxGas,   setMaxGas]   = useState('')
  const [pkgs,     setPkgs]     = useState('')
  const [creating, setCreating] = useState(false)
  const [createState, setCreateState] = useState<{ ok: boolean; msg: string } | null>(null)
  const [dapps,    setDapps]    = useState<DApp[]>([])
  const [loading,  setLoading]  = useState(false)

  const loadDapps = useCallback(async () => {
    if (!jwt) return
    setLoading(true)
    const r = await apiCall<DApp[] | { dapps: DApp[] }>('GET', '/v1/dapps', undefined, jwt)
    setLoading(false)
    if (r.ok) setDapps(Array.isArray(r.data) ? r.data : (r.data as { dapps: DApp[] }).dapps ?? [])
  }, [jwt])

  useEffect(() => { loadDapps() }, [loadDapps])

  async function doCreate() {
    setCreating(true); setCreateState(null)
    const pkgList = pkgs.split(',').map((s) => s.trim()).filter(Boolean)
    const r = await apiCall('POST', '/v1/dapps', {
      name, description: desc,
      allowedPackages: pkgList,
      wildcardSponsor: pkgList.length === 0,
      maxGasBudget: parseInt(maxGas) || 50000000,
    }, jwt)
    setCreating(false)
    if (r.ok) {
      setCreateState({ ok: true, msg: `"${name}" registered! Copy the App ID to create API keys.` })
      setName(''); setDesc(''); setPkgs(''); setMaxGas('')
      loadDapps()
    } else {
      setCreateState({ ok: false, msg: (r.data as { error?: string }).error ?? "Couldn't register app. Make sure you're signed in." })
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Apps"
        title="My apps"
        sub="Register each app you want to enable gas sponsorship for. Each gets its own settings and limits."
      />

      <FormPanel title="Register a new app" desc="Tell OpenSignal about your app so it knows which transactions to approve.">
        <div className="flex flex-col gap-3 mb-4">
          <Input label="App name" placeholder="e.g. My NFT Marketplace"
            value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="What does it do?" placeholder="e.g. Lets users mint and trade NFTs on Sui"
            value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Maximum gas per transaction" placeholder="50000000" type="number"
              value={maxGas} onChange={(e) => setMaxGas(e.target.value)}
              hint="Safety cap — transactions above this won't be sponsored. Default is 50M MIST." />
            <Input label="Approved contracts (optional)" placeholder="0xpkg1, 0xpkg2"
              value={pkgs} onChange={(e) => setPkgs(e.target.value)}
              hint="Leave blank to allow all transactions (wildcard mode)." />
          </div>
        </div>
        <Button variant="primary" onClick={doCreate} disabled={creating || !name}>
          {creating ? 'Registering…' : 'Register app'}
        </Button>
        {createState && <ResponseBox ok={createState.ok} friendly={createState.msg} />}
      </FormPanel>

      <FormPanel title="Your registered apps">
        <div className="flex justify-end mb-3">
          <Button variant="sm" onClick={loadDapps}>Refresh</Button>
        </div>
        {!jwt    && <p className="text-sm text-blue-400">Sign in to view your apps</p>}
        {jwt && loading && <Spinner label="Loading your apps…" />}
        {jwt && !loading && dapps.length === 0 && (
          <p className="text-sm text-blue-400">No apps yet — use the form above to register one.</p>
        )}
        <div className="divide-y divide-blue-50">
          {dapps.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3 gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-sm text-blue-900">{d.name ?? 'Unnamed app'}</p>
                <p className="text-xs text-blue-400 mt-0.5 font-mono">ID: {d.id}</p>
              </div>
              <Badge variant={d.wildcardSponsor ? 'warn' : 'ok'}>
                {d.wildcardSponsor ? 'All transactions' : 'Allowlist only'}
              </Badge>
            </div>
          ))}
        </div>
      </FormPanel>
    </div>
  )
}
