import { useEffect, useMemo, useRef, useState } from 'react'
import snapshot from '../leetcode-snapshot.json'
import { profile } from '../data'
import Reveal from '../lib/Reveal'
import { prefersReduced, useInView } from '../lib/motion'
import Icon from './Icons'
import '../styles/leetcode.css'

const API = import.meta.env.VITE_API_URL || ''
const DAY = 86400
const WEEKS = 53
const DIFFS = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
]
const fmt = (n) => n.toLocaleString('en-US')
const dateLabel = (ts) =>
  new Date(ts * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
// heatmap buckets → sequential blue steps (validated ramp, see leetcode.css)
const level = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4)

function normalizeFallback(p, base) {
  if (!p || typeof p.totalSolved !== 'number') return null
  const calendar =
    typeof p.submissionCalendar === 'string'
      ? JSON.parse(p.submissionCalendar || '{}')
      : p.submissionCalendar || base.calendar
  return {
    ...base,
    fetchedAt: new Date().toISOString(),
    ranking: p.ranking ?? base.ranking,
    solved: {
      all: p.totalSolved ?? base.solved.all,
      easy: p.easySolved ?? base.solved.easy,
      medium: p.mediumSolved ?? base.solved.medium,
      hard: p.hardSolved ?? base.solved.hard,
    },
    total: {
      all: p.totalQuestions ?? base.total.all,
      easy: p.totalEasy ?? base.total.easy,
      medium: p.totalMedium ?? base.total.medium,
      hard: p.totalHard ?? base.total.hard,
    },
    calendar,
  }
}

function useLeetCode() {
  const [data, setData] = useState(snapshot)
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`${API}/api/leetcode`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error('API route unavailable')
        return r.json()
      })
      .then((d) => {
        if (d?.solved) setData(d)
        else throw new Error('Invalid API response')
      })
      .catch(() => {
        // Direct browser fallback if /api/leetcode is blocked or unavailable
        return fetch('https://alfa-leetcode-api.onrender.com/userProfile/priyanshu2068', { signal: ctrl.signal })
          .then((r) => (r.ok ? r.json() : null))
          .then((fallback) => {
            const normalized = normalizeFallback(fallback, snapshot)
            if (normalized?.solved) setData(normalized)
          })
          .catch(() => {}) // gracefully keep bundled snapshot
      })
    return () => ctrl.abort()
  }, [])
  return data
}


function CountUp({ to, start }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!start) return
    if (prefersReduced()) return setN(to)
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / 1400)
      setN(Math.round(to * (1 - Math.pow(1 - t, 4))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, start])
  return fmt(n)
}

/** One shared tooltip that follows whichever mark is hovered or focused. */
function useTooltip() {
  const [tip, setTip] = useState(null)
  const bind = (text) => ({
    onPointerEnter: (e) => setTip({ text, x: e.clientX, y: e.clientY }),
    onPointerMove: (e) => setTip({ text, x: e.clientX, y: e.clientY }),
    onPointerLeave: () => setTip(null),
    onFocus: (e) => {
      const r = e.currentTarget.getBoundingClientRect()
      setTip({ text, x: r.left + r.width / 2, y: r.top })
    },
    onBlur: () => setTip(null),
  })
  const node = tip && (
    <div className="lc-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
      {tip.text}
    </div>
  )
  return [bind, node]
}

export default function LeetCode() {
  const data = useLeetCode()
  const ref = useRef(null)
  const heat = useRef(null)
  const seen = useInView(ref, { threshold: 0.2, once: true })
  const [bind, tooltip] = useTooltip()
  const url = profile.socials.find((s) => s.icon === 'leetcode')?.href

  // last 53 weeks of the submission calendar, columns = weeks (Sun → Sat)
  const { weeks, months, activeDays, submissions } = useMemo(() => {
    const now = new Date()
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000
    const start = today - (WEEKS - 1) * 7 * DAY - new Date(today * 1000).getUTCDay() * DAY
    const weeks = []
    const months = []
    let activeDays = 0, submissions = 0
    for (let w = 0; w < WEEKS; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const ts = start + (w * 7 + d) * DAY
        if (ts > today) break
        const n = data.calendar?.[ts] || 0
        if (n) {
          activeDays += 1
          submissions += n
        }
        col.push({ ts, n })
      }
      const first = new Date(col[0].ts * 1000)
      if (first.getUTCDate() <= 7) months.push({ w, label: first.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }) })
      weeks.push(col)
    }
    return { weeks, months, activeDays, submissions }
  }, [data])

  // show the most recent weeks first on narrow screens
  useEffect(() => {
    if (heat.current) heat.current.scrollLeft = heat.current.scrollWidth
  }, [weeks])

  const maxSolved = Math.max(...DIFFS.map((d) => data.solved[d.key] || 0), 1)
  const top = data.languages?.[0]
  const tiles = [
    { label: 'Global ranking', value: data.ranking ? `#${fmt(data.ranking)}` : '—' },
    { label: 'Active days · past year', value: fmt(activeDays) },
    { label: 'Submissions · past year', value: fmt(submissions) },
    { label: 'Main language', value: top ? top.name : '—', note: top ? `${fmt(top.solved)} problems` : '' },
  ]
  if (data.contest) tiles.push({ label: 'Contest rating', value: fmt(data.contest.rating), note: `top ${data.contest.topPercentage}%` })

  return (
    <section className="lc section" id="leetcode" ref={ref}>
      <div className="container">
        <div className="lc__head">
          <div>
            <Reveal as="p" className="eyebrow">Problem solving</Reveal>
            <Reveal as="h2" className="h2" delay={0.08}>
              Sharpening the <em>fundamentals.</em>
            </Reveal>
            <Reveal as="p" className="lead" delay={0.16}>
              Data structures and algorithms practice on LeetCode — mostly in C++, a little every day.
            </Reveal>
          </div>
          {url && (
            <Reveal delay={0.2}>
              <a className="btn btn--ghost" href={url} target="_blank" rel="noreferrer">
                <Icon name="leetcode" size={18} /> View LeetCode profile
              </a>
            </Reveal>
          )}
        </div>

        <div className={`lc__grid ${seen ? 'is-in' : ''}`}>
          {/* headline number + difficulty bars */}
          <Reveal className="lc-card lc-solved" delay={0.1}>
            <p className="lc-card__label">Problems solved</p>
            <p className="lc-solved__num">
              <CountUp to={data.solved.all} start={seen} />
            </p>
            <p className="lc-solved__of">of {fmt(data.total.all)} on LeetCode</p>
            <ul className="lc-bars" aria-label="Problems solved by difficulty">
              {DIFFS.map((d, i) => {
                const solved = data.solved[d.key] || 0
                const total = data.total[d.key] || 0
                const pct = total ? ((solved / total) * 100).toFixed(1) : '0'
                return (
                  <li key={d.key} className={`lc-bar lc-bar--${d.key}`} style={{ '--i': i }}>
                    <div className="lc-bar__row">
                      <span className="lc-bar__name">{d.label}</span>
                      <span className="lc-bar__val">
                        <b>{fmt(solved)}</b> / {fmt(total)}
                      </span>
                    </div>
                    <div
                      className="lc-bar__track"
                      tabIndex={0}
                      aria-label={`${d.label}: ${solved} of ${total} solved`}
                      {...bind(`${d.label}: ${fmt(solved)} of ${fmt(total)} solved (${pct}%)`)}
                    >
                      <i style={{ width: `${(solved / maxSolved) * 100}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Reveal>

          {/* stat tiles + badges */}
          <div className="lc-side">
            <div className="lc-tiles">
              {tiles.map((t, i) => (
                <Reveal className="lc-card lc-tile" key={t.label} delay={0.16 + i * 0.06}>
                  <p className="lc-card__label">{t.label}</p>
                  <p className="lc-tile__value">{t.value}</p>
                  {t.note && <p className="lc-tile__note">{t.note}</p>}
                </Reveal>
              ))}
            </div>
            {data.badges?.length > 0 && (
              <Reveal className="lc-card lc-badges" delay={0.4}>
                <p className="lc-card__label">Badges</p>
                <div className="lc-badges__list">
                  {data.badges.map((b) => (
                    <span className="lc-badge" key={b}>
                      <Icon name="badge" size={16} /> {b}
                    </span>
                  ))}
                </div>
              </Reveal>
            )}
          </div>

          {/* submission heatmap */}
          <Reveal className="lc-card lc-heat" delay={0.2}>
            <div className="lc-heat__head">
              <p className="lc-card__label">Submissions · past year</p>
              <div className="lc-heat__legend" aria-hidden="true">
                Less
                {[0, 1, 2, 3, 4].map((l) => (
                  <i key={l} className={`l${l}`} />
                ))}
                More
              </div>
            </div>
            <div className="lc-heat__scroll" ref={heat}>
              <div
                className="lc-heat__grid"
                role="img"
                aria-label={`${submissions} submissions on ${activeDays} days in the past year`}
                style={{ '--weeks': weeks.length }}
              >
                <div className="lc-heat__months" aria-hidden="true">
                  {months.map((m) => (
                    <span key={m.w} style={{ gridColumn: m.w + 1 }}>
                      {m.label}
                    </span>
                  ))}
                </div>
                {weeks.map((col, w) => (
                  <div className="lc-heat__col" key={w} style={{ '--w': w }}>
                    {col.map((c) => (
                      <i
                        key={c.ts}
                        className={`l${level(c.n)}`}
                        {...bind(`${c.n ? `${c.n} submission${c.n > 1 ? 's' : ''}` : 'No submissions'} · ${dateLabel(c.ts)}`)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <p className="lc__note">
          Live from LeetCode · updated {new Date(data.fetchedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      {tooltip}
    </section>
  )
}
