export interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  pulse: number
}

export interface DApp {
  id: string
  name: string
  description?: string
  wildcardSponsor: boolean
  maxGasBudget?: number
  totalGas?: number
  gasUsed?: number
}

export interface ApiKey {
  id: string
  name: string
  key?: string
  dappId: string
  revoked: boolean
  createdAt?: string
}

export interface SponsorEvent {
  id?: string
  dappId?: string
  dapp?: string
  sender?: string
  gasBudget?: number
  gas?: number
  status?: string
  createdAt?: string
}

export interface CheckoutSession {
  id: string
  status: string
  recipient: string
  purchaseAmountMist: number
  network: string
  memo?: string | null
  merchantReference?: string | null
  expiresAt?: string
  createdAt?: string
  dapp?: {
    id: string
    name: string
    network?: string
  }
}

export interface UsageSummary {
  totalSponsored?: number
  count?: number
  totalGasBudget?: number
  gasUsed?: number
  dappCount?: number
  keyCount?: number
  dailySeries?: number[]
  gasSeries?: number[]
  events?: SponsorEvent[]
}

export type PipelineStepState = 'idle' | 'done' | 'active'

export interface PipelineStep {
  id: string
  label: string
}
