'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiCall, seedSpark, sparkLabels } from '@/lib/api'
import { DApp, SponsorEvent, UsageSummary } from '@/types'
import SectionHeader from '@/components/layout/SectionHeader'
import Pipeline from '@/components/dashboard/Pipeline'
import KpiGrid from '@/components/dashboard/KpiGrid'
import SparkCard from '@/components/dashboard/SparkCard'
import GasBarChart from '@/components/dashboard/GasBarChart'
import ActivityTable from '@/components/dashboard/ActivityTable'

const DEMO_EVENTS: SponsorEvent[] = [
  { dapp: 'game-fi-alpha',    sender: '0xab12…ef', gas: 8200000,  status: 'ok'     },
  { dapp: 'nft-marketplace',  sender: '0xcd34…12', gas: 4100000,  status: 'ok'     },
  { dapp: 'defi-bridge',      sender: '0xef56…78', gas: 12500000, status: 'failed' },
  { dapp: 'wallet-demo',      sender: '0x1234…ab', gas: 2100000,  status: 'ok'     },
]

const DEMO_BARS = [
  { name: 'game-fi-alpha',   value: 78000000, pct: 78 },
  { name: 'nft-marketplace', value: 52000000, pct: 52 },
  { name: 'defi-bridge',     value: 34000000, pct: 34 },
  { name: 'wallet-demo',     value: 18000000, pct: 18 },
]

export default function DashboardPage() {
  const { jwt } = useAuth()
  const [usage,    setUsage]    = useState<UsageSummary>({})
  const [dapps,    setDapps]    = useState<DApp[]>([])
  const [keyCount, setKeyCount] = useState(0)
  const [events,   setEvents]   = useState<SponsorEvent[]>(DEMO_EVENTS)
  const [bars,     setBars]     = useState(DEMO_BARS)
  const [isDemo,   setIsDemo]   = useState(true)

  const labels    = sparkLabels(14)
  const txnSeries = usage.dailySeries ?? seedSpark(14, 120, 60)
  const gasSeries = usage.gasSeries   ?? seedSpark(14, 5000000, 2000000)

  async function load() {
    if (!jwt) return
    setIsDemo(false)
    const [uR, dR, kR] = await Promise.all([
      apiCall<UsageSummary>('GET', '/v1/usage/summary', undefined, jwt),
      apiCall<DApp[] | { dapps: DApp[] }>('GET', '/v1/dapps', undefined, jwt),
      apiCall<{ keys: unknown[] } | unknown[]>('GET', '/v1/keys', undefined, jwt),
    ])
    if (uR.ok) setUsage(uR.data)
    if (dR.ok) {
      const list = Array.isArray(dR.data) ? dR.data : (dR.data as { dapps: DApp[] }).dapps ?? []
      setDapps(list)
      const max = Math.max(...list.map((d) => d.totalGas ?? d.gasUsed ?? 1), 1)
      setBars(list.slice(0, 6).map((d) => {
        const v = d.totalGas ?? d.gasUsed ?? 0
        return { name: d.name ?? d.id, value: v, pct: Math.round((v / max) * 100) }
      }))
    }
    if (kR.ok) {
      const keys = Array.isArray(kR.data) ? kR.data : (kR.data as { keys: unknown[] }).keys ?? []
      setKeyCount(keys.length)
    }
    if (uR.ok && (uR.data as UsageSummary).events?.length) {
      setEvents((uR.data as UsageSummary).events!)
    }
  }

  useEffect(() => { load() }, [jwt])

  const kpiTxns  = isDemo ? '—' : (usage.totalSponsored ?? usage.count ?? 0).toLocaleString()
  const kpiGas   = isDemo ? '—' : `${((usage.totalGasBudget ?? usage.gasUsed ?? 0) / 1e6).toFixed(1)}M`
  const kpiDapps = isDemo ? '—' : dapps.length.toString()
  const kpiKeys  = isDemo ? '—' : keyCount.toString()

  return (
    <div className="w-full">
      <SectionHeader
        eyebrow="Live overview"
        title="Your signal, at a glance"
        sub="Real-time sponsorship data across all your apps — refreshed on demand."
      />
      <Pipeline />
      <KpiGrid txns={kpiTxns} gas={kpiGas} dapps={kpiDapps} keys={kpiKeys} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <SparkCard
          id="spark-txn"
          label="Transactions this week"
          value={isDemo ? 'Sign in to see' : `${txnSeries[txnSeries.length - 1].toLocaleString()} today`}
          data={txnSeries} labels={labels}
          color={isDemo ? '#B5D4F4' : '#185FA5'}
        />
        <SparkCard
          id="spark-gas"
          label="Gas covered this week"
          value={isDemo ? 'Sign in to see' : `${(gasSeries[gasSeries.length - 1] / 1e6).toFixed(1)}M MIST`}
          data={gasSeries} labels={labels}
          color={isDemo ? '#B5D4F4' : '#1D9E75'}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <GasBarChart bars={bars} onRefresh={load} isDemo={isDemo} />
        <ActivityTable events={events} isDemo={isDemo} />
      </div>
    </div>
  )
}
