'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { id: 'ps1', label: 'App sends txn' },
  { id: 'ps2', label: 'Policy checked' },
  { id: 'ps3', label: 'Gas covered' },
  { id: 'ps4', label: 'Signed & sent' },
  { id: 'ps5', label: 'On-chain ✓' },
]

export default function Pipeline() {
  const [activeStep, setActiveStep] = useState(3)

  useEffect(() => {
    const t = setInterval(() => setActiveStep((s) => (s >= STEPS.length ? 1 : s + 1)), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#042C53' }}>
      <p className="text-xs font-semibold text-blue-400 mb-4 tracking-widest uppercase">
        Sponsorship pipeline
      </p>
      <div className="flex items-center flex-wrap gap-y-2">
        {STEPS.map((step, i) => {
          const pos = i + 1
          const isDone   = pos < activeStep
          const isActive = pos === activeStep
          const dotCls = isDone
            ? 'bg-blue-600 border-blue-600 text-white'
            : isActive
            ? 'bg-teal-500 border-teal-500 text-white'
            : 'bg-white/5 border-white/20 text-blue-300'

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1 min-w-16">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-500 ${dotCls}`}
                  style={isActive ? { boxShadow: '0 0 12px rgba(20,184,166,0.5)' } : {}}>
                  {pos}
                </div>
                <span className="text-xs text-center leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-5 h-px mx-1 mb-5" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
