'use client'

import { useState } from 'react'
import { apiCall } from '@/lib/api'
import SectionHeader from '@/components/layout/SectionHeader'
import FormPanel from '@/components/layout/FormPanel'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import ResponseBox from '@/components/ui/ResponseBox'
import Spinner from '@/components/ui/Spinner'

interface CallState {
  ok: boolean
  msg: string
  raw?: Record<string, unknown>
}

export default function SponsorPage() {
  const [qSender, setQSender] = useState('')
  const [qTxKind, setQTxKind] = useState('')
  const [qApiKey, setQApiKey] = useState('')
  const [qDapp,   setQDapp]   = useState('')
  const [qLoading, setQLoading] = useState(false)
  const [qState,   setQState]   = useState<CallState | null>(null)

  const [sSender, setSSender] = useState('')
  const [sTxKind, setSTxKind] = useState('')
  const [sApiKey, setSApiKey] = useState('')
  const [sBudget, setSBudget] = useState('')
  const [sLoading, setSLoading] = useState(false)
  const [sState,   setSState]   = useState<CallState | null>(null)

  async function doQuote() {
    setQLoading(true); setQState(null)
    const r = await apiCall('POST', '/v1/sponsor/quote',
      { sender: qSender, transactionKind: qTxKind, dappId: qDapp },
      undefined, qApiKey)
    setQLoading(false)
    const data = r.data as Record<string, unknown>
    if (r.ok) {
      const gas = (data.gasBudget ?? data.estimatedGas) as number | undefined
      setQState({ ok: true, msg: `Transaction approved! Estimated gas: ${gas != null ? gas.toLocaleString() + ' MIST' : 'see details below'}. Ready to sponsor.`, raw: data })
    } else {
      setQState({ ok: false, msg: (data.error as string | undefined) ?? "This transaction was rejected by your app's policy." })
    }
  }

  async function doSign() {
    setSLoading(true); setSState(null)
    const r = await apiCall('POST', '/v1/sponsor/sign',
      { sender: sSender, transactionKind: sTxKind, ...(sBudget ? { gasBudget: parseInt(sBudget) } : {}) },
      undefined, sApiKey)
    setSLoading(false)
    const data = r.data as Record<string, unknown>
    if (r.ok) {
      setSState({ ok: true, msg: 'Transaction sponsored and signed. The signed bytes are ready — your app can submit them on-chain.', raw: data })
    } else {
      setSState({ ok: false, msg: (data.error as string | undefined) ?? 'Sponsorship failed. Check your API key and transaction data.' })
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
      <div className="lg:col-span-2">
        <SectionHeader
          eyebrow="Transact"
          title="Sponsor a transaction"
          sub="Test sponsorship manually. Paste your transaction details and OpenSignal will cover the gas fee."
        />
      </div>

      <FormPanel step={1} title="Check a transaction first" desc="See if it will pass your policy before committing." className="lg:mb-0 h-full">
        <div className="flex flex-col gap-3 mb-4">
          <Input label="Sender wallet address" placeholder="0x..."
            value={qSender} onChange={(e) => setQSender(e.target.value)} />
          <Textarea label="Transaction data" placeholder="Paste the base64 transaction bytes here..."
            value={qTxKind} onChange={(e) => setQTxKind(e.target.value)}
            hint="The serialised transaction your app created." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Your API key" placeholder="os_live_..."
              value={qApiKey} onChange={(e) => setQApiKey(e.target.value)} />
            <Input label="App ID" placeholder="dapp_..."
              value={qDapp} onChange={(e) => setQDapp(e.target.value)} />
          </div>
        </div>
        <Button onClick={doQuote} disabled={qLoading || !qSender || !qTxKind || !qApiKey}>
          {qLoading ? 'Checking…' : 'Check transaction'}
        </Button>
        {qLoading && <Spinner label="Checking your transaction…" />}
        {qState && <ResponseBox ok={qState.ok} friendly={qState.msg} />}
        {qState?.raw && <ResponseBox ok={qState.ok} raw={qState.raw} />}
      </FormPanel>

      <FormPanel step={2} title="Sponsor and sign it" desc="OpenSignal covers the gas and returns signed bytes ready for the chain." className="lg:mb-0 h-full">
        <div className="flex flex-col gap-3 mb-4">
          <Input label="Sender wallet address" placeholder="0x..."
            value={sSender} onChange={(e) => setSSender(e.target.value)} />
          <Textarea label="Transaction data" placeholder="Paste the base64 transaction bytes here..."
            value={sTxKind} onChange={(e) => setSTxKind(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Your API key" placeholder="os_live_..."
              value={sApiKey} onChange={(e) => setSApiKey(e.target.value)} />
            <Input label="Gas limit (optional)" placeholder="Leave blank for app default" type="number"
              value={sBudget} onChange={(e) => setSBudget(e.target.value)} />
          </div>
        </div>
        <Button variant="primary" onClick={doSign} disabled={sLoading || !sSender || !sTxKind || !sApiKey}>
          {sLoading ? 'Sponsoring…' : 'Sponsor this transaction'}
        </Button>
        {sLoading && <Spinner label="Sponsoring your transaction…" />}
        {sState && <ResponseBox ok={sState.ok} friendly={sState.msg} />}
        {sState?.raw && <ResponseBox ok={sState.ok} raw={sState.raw} />}
      </FormPanel>
    </div>
  )
}
