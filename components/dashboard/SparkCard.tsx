'use client'

import { useEffect, useRef } from 'react'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler)

interface Props {
  id: string
  label: string
  value: string
  data: number[]
  labels: string[]
  color: string
}

export default function SparkCard({ id, label, value, data, labels, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          backgroundColor: color + '18',
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: { duration: 700 },
      },
    })
    return () => { chartRef.current?.destroy() }
  }, [data, labels, color])

  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-4">
      <p className="text-xs text-blue-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-blue-900 mb-2">{value}</p>
      <canvas ref={canvasRef} id={id} style={{ height: 55, display: 'block', width: '100%' }} />
    </div>
  )
}
