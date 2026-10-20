import { useEffect, useRef, useState } from 'react'
import { emitOnce, onceFired } from '../lib/bus'
import { prefersReduced } from '../lib/motion'
import { profile } from '../data'

// Colour ramps taken from the reference loader: deep space → brand blue, and blue → white
const DEEP = [[0, [1, 2, 7]], [0.3, [3, 6, 24]], [0.55, [6, 17, 90]], [0.78, [0, 47, 225]], [1, [44, 84, 255]]]
const LIGHT = [[0, [28, 72, 255]], [0.3, [84, 128, 255]], [0.55, [146, 176, 255]], [0.78, [204, 218, 255]], [1, [246, 249, 255]]]
const GROUND = [239, 239, 239]
const DURATION = 2200

const smooth = (t) => t * t * (3 - 2 * t)
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`
function ramp(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1]
      const [p1, c1] = stops[i]
      return mix(c0, c1, smooth((t - p0) / (p1 - p0)))
    }
  }
  return stops[stops.length - 1][1]
}

export default function Loader() {
  const canvas = useRef(null)
  const [pct, setPct] = useState(0)
  const [state, setState] = useState(() => (prefersReduced() ? 'gone' : 'run')) // run → exit → gone

  useEffect(() => {
    if (state === 'gone') {
      document.documentElement.classList.remove('is-loading')
      if (!onceFired('loader:done')) emitOnce('loader:done')
      return
    }
    if (state !== 'run') return
    document.documentElement.classList.add('is-loading')
    const c = canvas.current
    const ctx = c.getContext('2d')
    let w = 0, h = 0, dpr = 1, raf = 0
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = c.width = innerWidth * dpr
      h = c.height = innerHeight * dpr
    }
    resize()
    addEventListener('resize', resize)

    const stars = Array.from({ length: 220 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: Math.random() * 0.9 + 0.02,
      s: Math.random() * 0.6 + 0.4,
    }))
    const RINGS = 14
    const start = performance.now()

    const frame = (now) => {
      const t = clamp((now - start) / DURATION)
      const cx = w / 2, cy = h / 2
      // background: deep → blue, then flood with light at the end
      let bg = ramp(DEEP, clamp(t / 0.72))
      if (t > 0.72) bg = mix(ramp(LIGHT, clamp((t - 0.72) / 0.2)), GROUND, smooth(clamp((t - 0.86) / 0.14)))
      ctx.fillStyle = rgba(bg)
      ctx.fillRect(0, 0, w, h)

      // tunnel of rounded frames rushing toward the camera
      const speed = 0.35 + 2.6 * t * t
      const camZ = (now - start) / 1000 * speed
      const fade = 1 - smooth(clamp((t - 0.8) / 0.2))
      for (let i = 0; i < RINGS; i++) {
        let z = ((i / RINGS - camZ) % 1 + 1) % 1 // 0 near, 1 far
        const scale = 0.06 / (z * z + 0.012)
        const rw = (w * 0.34) * scale, rh = (h * 0.3) * scale
        if (rw > w * 3) continue
        const depth = 1 - z
        ctx.strokeStyle = rgba(ramp(LIGHT, clamp(depth * 0.9 + t * 0.2)), (0.12 + depth * 0.55) * fade)
        ctx.lineWidth = Math.max(1, 2.2 * dpr * depth)
        const r = Math.min(rw, rh) * 0.08
        ctx.beginPath()
        ctx.roundRect(cx - rw / 2, cy - rh / 2, rw, rh, r)
        ctx.stroke()
      }

      // star streaks
      for (const s of stars) {
        s.r += 0.0025 * s.s * speed * 3
        if (s.r > 1.2) { s.r = 0.02; s.a = Math.random() * Math.PI * 2 }
        const R = Math.max(w, h) * 0.7
        const len = 6 + 60 * t * s.s
        const x1 = cx + Math.cos(s.a) * s.r * R, y1 = cy + Math.sin(s.a) * s.r * R
        const x0 = x1 - Math.cos(s.a) * len * dpr * s.r, y0 = y1 - Math.sin(s.a) * len * dpr * s.r
        ctx.strokeStyle = `rgba(220,230,255,${(0.25 + 0.6 * s.r) * fade})`
        ctx.lineWidth = dpr * (0.6 + s.r)
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
      }

      // glow core
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * (0.15 + t * 0.6))
      g.addColorStop(0, `rgba(90,127,255,${0.45 * fade})`)
      g.addColorStop(1, 'rgba(90,127,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      setPct(Math.round(smooth(t) * 100))
      if (t < 1) raf = requestAnimationFrame(frame)
      else {
        clearTimeout(safety)
        setState('exit')
        emitOnce('loader:done')
      }
    }
    const safety = setTimeout(() => {
      setState('exit')
      emitOnce('loader:done')
    }, 2400)
    raf = requestAnimationFrame(frame)
    return () => {
      clearTimeout(safety)
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
    }
  }, [state])

  useEffect(() => {
    if (state !== 'exit') return
    document.documentElement.classList.remove('is-loading')
    const id = setTimeout(() => setState('gone'), 800)
    return () => clearTimeout(id)
  }, [state])

  if (state === 'gone') return null
  return (
    <div className={`loader ${state === 'exit' ? 'is-exit' : ''} ${pct >= 80 ? 'is-light' : ''}`} aria-hidden="true">
      <canvas ref={canvas} />
      <div className="loader__mark">
        <span className="loader__name" aria-label={profile.fullName}>
          {profile.fullName.split(' ').map((word, w, words) => {
            const offset = words.slice(0, w).join('').length
            return (
              <span className="loader__word" key={w}>
                {[...word].map((ch, i) => (
                  <span className="loader__ch" key={i} style={{ '--i': offset + i }}>{ch}</span>
                ))}
              </span>
            )
          })}
          <b className="loader__slash" style={{ '--i': profile.fullName.replace(/ /g, '').length }}>/</b>
        </span>
        <span className="loader__pct">{String(pct).padStart(3, '0')}%</span>
      </div>
    </div>
  )
}
