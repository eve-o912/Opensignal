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
    <div className="rounded-2xl p-5 mb-6 bg-gray-900 border border-gray-700">
      <p className="text-xs font-semibold text-gray-400 mb-4 tracking-widest uppercase">
        Sponsorship pipeline
      </p>
      <div className="flex items-center flex-wrap gap-y-2">
        {STEPS.map((step, i) => {
          const pos = i + 1
          const isDone   = pos < activeStep
          const isActive = pos === activeStep
          const dotCls = isDone
            ? 'bg-white border-white text-black'
            : isActive
            ? 'bg-gray-400 border-gray-400 text-black'
            : 'bg-gray-800 border-gray-700 text-gray-500'

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1 min-w-16">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-500 ${dotCls}`}
                  style={isActive ? { boxShadow: '0 0 12px rgba(156,163,175,0.5)' } : {}}>
                  {pos}
                </div>
                <span className="text-xs text-center leading-tight text-gray-500">
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-5 h-px mx-1 mb-5 bg-gray-700" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
