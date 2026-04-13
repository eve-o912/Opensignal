'use client'

import { useEffect, useRef } from 'react'
import { Node } from '@/types'

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const nodesRef  = useRef<Node[]>([])
  const mouseRef  = useRef({ x: -999, y: -999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0
    const H = 220

    function createNode(): Node {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2,
      }
    }

    function init() {
      W = canvas!.width = canvas!.offsetWidth
      canvas!.height = H
      const count = Math.max(Math.floor((W * H) / 8000), 18)
      nodesRef.current = Array.from({ length: count }, createNode)
    }

    function applyRepulsion(n: Node) {
      const dx = n.x - mouseRef.current.x
      const dy = n.y - mouseRef.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 80 && dist > 0) {
        const force = (1 - dist / 80) * 0.6
        n.vx += (dx / dist) * force
        n.vy += (dy / dist) * force
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy)
        if (speed > 2) { n.vx = (n.vx / speed) * 2; n.vy = (n.vy / speed) * 2 }
      }
    }

    function draw() {
      animRef.current = requestAnimationFrame(draw)
      ctx!.fillStyle = '#042C53'
      ctx!.fillRect(0, 0, W, H)

      const nodes = nodesRef.current
      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.02
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
        applyRepulsion(n)
      })

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.25
            ctx!.beginPath()
            ctx!.moveTo(nodes[i].x, nodes[i].y)
            ctx!.lineTo(nodes[j].x, nodes[j].y)
            ctx!.strokeStyle = `rgba(55,138,221,${alpha})`
            ctx!.lineWidth = 0.8
            ctx!.stroke()
          }
        }
      }

      nodes.forEach((n) => {
        const glow = 0.6 + Math.sin(n.pulse) * 0.4
        ctx!.beginPath()
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(133,183,235,${glow})`
        ctx!.fill()
      })
    }

    let resizeTimer: ReturnType<typeof setTimeout>
    function onResize() {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => { cancelAnimationFrame(animRef.current); init(); draw() }, 100)
    }
    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function onMouseLeave() { mouseRef.current = { x: -999, y: -999 } }

    window.addEventListener('resize', onResize)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    init(); draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <div className="relative overflow-hidden" style={{ backgroundColor: '#042C53', minHeight: 220 }}>
      <canvas ref={canvasRef} className="block w-full" style={{ height: 220 }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
        <p className="text-xs tracking-widest uppercase text-blue-400 mb-2.5">
          Gas sponsorship infrastructure
        </p>
        <h1 className="text-3xl md:text-5xl font-semibold text-white leading-tight mb-2.5">
          Gas-free transactions.<br />
          <span className="text-blue-400">Your users never pay.</span>
        </h1>
        <p className="text-sm text-blue-300 max-w-md leading-relaxed">
          OpenSignal covers every gas fee so your users can just… transact.
        </p>
      </div>
    </div>
  )
}
