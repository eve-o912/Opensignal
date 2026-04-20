'use client'

import { useCallback, useEffect, useState } from 'react'
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

interface PortalDApp {
  id: string
  name: string
  network: 'testnet' | 'mainnet'
  allowlistMode: 'strict' | 'open'
  dailyBudgetMist?: number | null
}

interface PortalUsageSummary {
  appId: string
  appName: string
  totalRequests: number
  successRequests: number
  failedRequests: number
  totalGasBudget: number
  recentEvents: Array<{
    id: string
    endpoint: string
    status: string
    gasBudget?: number | null
    createdAt: string
  }>
}

function toUiDApp(dapp: PortalDApp, totalGas?: number): DApp {
  return {
    id: dapp.id,
    name: dapp.name,
    description: dapp.network,
    wildcardSponsor: dapp.allowlistMode === 'open',
    maxGasBudget: dapp.dailyBudgetMist ?? undefined,
    totalGas,
  }
}

function mapEvent(appName: string, event: PortalUsageSummary['recentEvents'][number]): SponsorEvent {
  return {
    id: event.id,
    dapp: appName,
    gas: event.gasBudget ?? undefined,
    status: event.status,
    createdAt: event.createdAt,
  }
}

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

  const load = useCallback(async () => {
    if (!jwt) {
      setIsDemo(true)
      return
    }

    setIsDemo(false)

    const appsRes = await apiCall<{ apps?: PortalDApp[] }>('GET', '/v1/portal/apps', undefined, jwt)
    if (!appsRes.ok) return

    const apps = appsRes.data.apps ?? []
    if (!apps.length) {
      setDapps([])
      setBars([])
      setEvents([])
      setUsage({ totalSponsored: 0, totalGasBudget: 0 })
      setKeyCount(0)
      return
    }

    const usageResponses = await Promise.all(
      apps.map(async (app) => {
        const summaryRes = await apiCall<{ summary?: PortalUsageSummary }>(
          'GET',
          `/v1/portal/usage/summary?appId=${encodeURIComponent(app.id)}`,
          undefined,
          jwt
        )

        const keysRes = await apiCall<{ apiKeys?: unknown[] }>(
          'GET',
          `/v1/portal/apps/${encodeURIComponent(app.id)}/api-keys`,
          undefined,
          jwt
        )

        return {
          app,
          summary: summaryRes.ok ? summaryRes.data.summary : undefined,
          keyCount: keysRes.ok ? (keysRes.data.apiKeys ?? []).length : 0,
        }
      })
    )

    const totalSponsored = usageResponses.reduce((sum, row) => sum + (row.summary?.totalRequests ?? 0), 0)
    const totalGasBudget = usageResponses.reduce((sum, row) => sum + (row.summary?.totalGasBudget ?? 0), 0)
    const totalKeys = usageResponses.reduce((sum, row) => sum + row.keyCount, 0)

    const uiApps = usageResponses.map((row) => toUiDApp(row.app, row.summary?.totalGasBudget ?? 0))
    setDapps(uiApps)
    setKeyCount(totalKeys)
    setUsage({ totalSponsored, totalGasBudget })

    const max = Math.max(...usageResponses.map((row) => row.summary?.totalGasBudget ?? 0), 1)
    setBars(
      usageResponses.slice(0, 6).map((row) => {
        const value = row.summary?.totalGasBudget ?? 0
        return {
          name: row.app.name,
          value,
          pct: Math.round((value / max) * 100),
        }
      })
    )

    const mergedEvents = usageResponses
      .flatMap((row) => (row.summary?.recentEvents ?? []).map((event) => mapEvent(row.app.name, event)))
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 20)

    setEvents(mergedEvents.length ? mergedEvents : DEMO_EVENTS)
  }, [jwt])

  useEffect(() => { load() }, [load])

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
