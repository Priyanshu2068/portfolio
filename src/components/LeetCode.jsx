import { useEffect, useMemo, useRef, useState } from 'react'
import lcSnapshot from '../leetcode-snapshot.json'
import ghSnapshot from '../github-snapshot.json'
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
const fmt = (n) => (n ?? 0).toLocaleString('en-US')
const dateLabel = (ts) =>
  new Date(ts * 1000).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

// Heatmap buckets (0-4)
const level = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4)

function normalizeLcFallback(p, base) {
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
  const [data, setData] = useState(lcSnapshot)
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
        return fetch('https://alfa-leetcode-api.onrender.com/userProfile/priyanshu2068', {
          signal: ctrl.signal,
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((fallback) => {
            const normalized = normalizeLcFallback(fallback, lcSnapshot)
            if (normalized?.solved) setData(normalized)
          })
          .catch(() => {})
      })
    return () => ctrl.abort()
  }, [])
  return data
}

function useGitHub() {
  const [data, setData] = useState(ghSnapshot)
  useEffect(() => {
    const ctrl = new AbortController()
    fetch('https://github-contributions-api.jogruber.de/v4/Priyanshu2068?y=last', {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((cData) => {
        if (!cData?.contributions) return
        const days = cData.contributions || []
        let activeDays = 0,
          maxDay = 0,
          longestStreak = 0,
          tempStreak = 0
        const calendarMap = {}
        for (const d of days) {
          calendarMap[d.date] = { count: d.count, level: d.level }
          if (d.count > 0) {
            activeDays++
            tempStreak++
            if (tempStreak > longestStreak) longestStreak = tempStreak
            if (d.count > maxDay) maxDay = d.count
          } else {
            tempStreak = 0
          }
        }
        setData((prev) => ({
          ...prev,
          fetchedAt: new Date().toISOString(),
          totalContributions: cData.total?.lastYear ?? prev.totalContributions,
          activeDays: activeDays || prev.activeDays,
          maxDay: maxDay || prev.maxDay,
          longestStreak: longestStreak || prev.longestStreak,
          calendar: calendarMap,
        }))
      })
      .catch(() => {})
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
  const lcData = useLeetCode()
  const ghData = useGitHub()
  const [tab, setTab] = useState('leetcode') // 'leetcode' | 'github'

  const ref = useRef(null)
  const heat = useRef(null)
  const seen = useInView(ref, { threshold: 0.2, once: true })
  const [bind, tooltip] = useTooltip()

  const lcUrl = profile.socials.find((s) => s.icon === 'leetcode')?.href
  const ghUrl = profile.socials.find((s) => s.icon === 'github')?.href

  // Build 53-week submission calendar for LeetCode
  const lcHeatmap = useMemo(() => {
    const now = new Date()
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000
    const start = today - (WEEKS - 1) * 7 * DAY - new Date(today * 1000).getUTCDay() * DAY
    const weeks = []
    const months = []
    let activeDays = 0,
      submissions = 0
    for (let w = 0; w < WEEKS; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const ts = start + (w * 7 + d) * DAY
        if (ts > today) break
        const n = lcData.calendar?.[ts] || 0
        if (n) {
          activeDays += 1
          submissions += n
        }
        col.push({ ts, n, lvl: level(n) })
      }
      const first = new Date(col[0].ts * 1000)
      if (first.getUTCDate() <= 7) {
        months.push({
          w,
          label: first.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
        })
      }
      weeks.push(col)
    }
    return { weeks, months, activeDays, submissions }
  }, [lcData])

  // Build 53-week contribution calendar for GitHub
  const ghHeatmap = useMemo(() => {
    const now = new Date()
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000
    const start = today - (WEEKS - 1) * 7 * DAY - new Date(today * 1000).getUTCDay() * DAY
    const weeks = []
    const months = []
    let activeDays = 0,
      contributions = 0
    for (let w = 0; w < WEEKS; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const ts = start + (w * 7 + d) * DAY
        if (ts > today) break
        const dateStr = new Date(ts * 1000).toISOString().slice(0, 10)
        const entry = ghData.calendar?.[dateStr]
        const n = entry?.count || 0
        const lvl = entry?.level ?? level(n)
        if (n) {
          activeDays += 1
          contributions += n
        }
        col.push({ ts, n, lvl })
      }
      const first = new Date(col[0].ts * 1000)
      if (first.getUTCDate() <= 7) {
        months.push({
          w,
          label: first.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
        })
      }
      weeks.push(col)
    }
    return { weeks, months, activeDays, contributions }
  }, [ghData])

  // Scroll to current week on mobile/small screens
  useEffect(() => {
    if (heat.current) heat.current.scrollLeft = heat.current.scrollWidth
  }, [tab, lcHeatmap.weeks, ghHeatmap.weeks])

  // LeetCode tiles
  const maxSolved = Math.max(...DIFFS.map((d) => lcData.solved[d.key] || 0), 1)
  const topLanguage = lcData.languages?.[0]
  const lcTiles = [
    { label: 'Global ranking', value: lcData.ranking ? `#${fmt(lcData.ranking)}` : '—' },
    { label: 'Active days · past year', value: fmt(lcHeatmap.activeDays) },
    { label: 'Submissions · past year', value: fmt(lcHeatmap.submissions) },
    {
      label: 'Main language',
      value: topLanguage ? topLanguage.name : '—',
      note: topLanguage ? `${fmt(topLanguage.solved)} problems` : '',
    },
  ]
  if (lcData.contest) {
    lcTiles.push({
      label: 'Contest rating',
      value: fmt(lcData.contest.rating),
      note: `top ${lcData.contest.topPercentage}%`,
    })
  }

  // GitHub tiles
  const ghTiles = [
    {
      label: 'Public repositories',
      value: fmt(ghData.publicRepos || 10),
      note: 'Open source & full-stack apps',
    },
    {
      label: 'Active days · past year',
      value: fmt(ghHeatmap.activeDays || ghData.activeDays || 24),
      note: `${ghData.longestStreak || 3}-day peak streak`,
    },
    {
      label: 'Top day commits',
      value: fmt(ghData.maxDay || 9),
      note: 'Maximum in a single day',
    },
    {
      label: 'GitHub profile',
      value: `@${ghData.username || 'Priyanshu2068'}`,
      note: `${ghData.followers || 2} followers on GitHub`,
    },
  ]

  const isLc = tab === 'leetcode'
  const activeUrl = isLc ? lcUrl : ghUrl
  const activeFetchedAt = isLc ? lcData.fetchedAt : ghData.fetchedAt

  return (
    <section className="lc section" id="leetcode" ref={ref}>
      <div className="container">
        <div className="lc__head">
          <div>
            <Reveal as="p" className="eyebrow">
              {isLc ? 'Problem solving' : 'Open source & engineering'}
            </Reveal>
            <Reveal as="h2" className="h2" delay={0.08}>
              {isLc ? (
                <>
                  Sharpening the <em>fundamentals.</em>
                </>
              ) : (
                <>
                  Building in the <em>open.</em>
                </>
              )}
            </Reveal>
            <Reveal as="p" className="lead" delay={0.16}>
              {isLc
                ? 'Data structures and algorithms practice on LeetCode — mostly in C++, a little every day.'
                : 'Commits, full-stack repositories, and open source development on GitHub — learning, building, and shipping.'}
            </Reveal>
          </div>

          <div className="activity-controls">
            <div className="activity-tabs" role="tablist" aria-label="Select Activity Source">
              <button
                type="button"
                role="tab"
                id="tab-leetcode"
                aria-selected={isLc}
                className={`activity-tab ${isLc ? 'is-active is-leetcode' : ''}`}
                onClick={() => setTab('leetcode')}
              >
                <Icon name="leetcode" size={17} /> LeetCode
              </button>
              <button
                type="button"
                role="tab"
                id="tab-github"
                aria-selected={!isLc}
                className={`activity-tab ${!isLc ? 'is-active is-github' : ''}`}
                onClick={() => setTab('github')}
              >
                <Icon name="github" size={17} /> GitHub
              </button>
            </div>

            {activeUrl && (
              <Reveal delay={0.2}>
                <a className="btn btn--ghost" href={activeUrl} target="_blank" rel="noreferrer">
                  <Icon name={isLc ? 'leetcode' : 'github'} size={18} />
                  {isLc ? 'View LeetCode profile' : 'View GitHub profile'}
                </a>
              </Reveal>
            )}
          </div>
        </div>

        {/* Tab Content: LeetCode */}
        {isLc ? (
          <div key="lc-grid" className={`lc__grid lc-tab-content ${seen ? 'is-in' : ''}`}>
            {/* Headline number + difficulty bars */}
            <Reveal className="lc-card lc-solved" delay={0.1}>
              <p className="lc-card__label">Problems solved</p>
              <p className="lc-solved__num">
                <CountUp to={lcData.solved.all} start={seen} />
              </p>
              <p className="lc-solved__of">of {fmt(lcData.total.all)} on LeetCode</p>
              <ul className="lc-bars" aria-label="Problems solved by difficulty">
                {DIFFS.map((d, i) => {
                  const solved = lcData.solved[d.key] || 0
                  const total = lcData.total[d.key] || 0
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

            {/* Stat tiles + badges */}
            <div className="lc-side">
              <div className="lc-tiles">
                {lcTiles.map((t, i) => (
                  <Reveal className="lc-card lc-tile" key={t.label} delay={0.16 + i * 0.06}>
                    <p className="lc-card__label">{t.label}</p>
                    <p className="lc-tile__value">{t.value}</p>
                    {t.note && <p className="lc-tile__note">{t.note}</p>}
                  </Reveal>
                ))}
              </div>
              {lcData.badges?.length > 0 && (
                <Reveal className="lc-card lc-badges" delay={0.4}>
                  <p className="lc-card__label">Badges</p>
                  <div className="lc-badges__list">
                    {lcData.badges.map((b) => (
                      <span className="lc-badge" key={b}>
                        <Icon name="badge" size={16} /> {b}
                      </span>
                    ))}
                  </div>
                </Reveal>
              )}
            </div>

            {/* Submission Heatmap */}
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
                  aria-label={`${lcHeatmap.submissions} submissions on ${lcHeatmap.activeDays} days in the past year`}
                  style={{ '--weeks': lcHeatmap.weeks.length }}
                >
                  <div className="lc-heat__months" aria-hidden="true">
                    {lcHeatmap.months.map((m) => (
                      <span key={m.w} style={{ gridColumn: m.w + 1 }}>
                        {m.label}
                      </span>
                    ))}
                  </div>
                  {lcHeatmap.weeks.map((col, w) => (
                    <div className="lc-heat__col" key={w} style={{ '--w': w }}>
                      {col.map((c) => (
                        <i
                          key={c.ts}
                          className={`l${c.lvl}`}
                          {...bind(
                            `${c.n ? `${c.n} submission${c.n > 1 ? 's' : ''}` : 'No submissions'} · ${dateLabel(c.ts)}`
                          )}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        ) : (
          /* Tab Content: GitHub */
          <div key="gh-grid" className={`lc__grid lc-tab-content ${seen ? 'is-in' : ''}`}>
            {/* Headline number + language distribution bars */}
            <Reveal className="lc-card lc-solved" delay={0.1}>
              <p className="lc-card__label">GitHub Contributions</p>
              <p className="lc-solved__num">
                <CountUp to={ghHeatmap.contributions || ghData.totalContributions} start={seen} />
              </p>
              <p className="lc-solved__of">contributions in the past year</p>
              <ul className="lc-bars" aria-label="Top repository languages on GitHub">
                {ghData.languages?.slice(0, 4).map((lang, i) => {
                  const total = ghData.publicRepos || 10
                  const pct = Math.round((lang.count / total) * 100)
                  const key = lang.name.toLowerCase()
                  return (
                    <li key={lang.name} className={`lc-bar lc-bar--${key}`} style={{ '--i': i }}>
                      <div className="lc-bar__row">
                        <span className="lc-bar__name">{lang.name}</span>
                        <span className="lc-bar__val">
                          <b>{lang.count}</b> repo{lang.count > 1 ? 's' : ''} ({pct}%)
                        </span>
                      </div>
                      <div
                        className="lc-bar__track"
                        tabIndex={0}
                        aria-label={`${lang.name}: ${lang.count} repositories`}
                        {...bind(`${lang.name}: ${lang.count} repositories (${pct}% of public projects)`)}
                      >
                        <i style={{ width: `${(lang.count / total) * 100}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Reveal>

            {/* Stat tiles */}
            <div className="lc-side">
              <div className="lc-tiles">
                {ghTiles.map((t, i) => (
                  <Reveal className="lc-card lc-tile" key={t.label} delay={0.16 + i * 0.06}>
                    <p className="lc-card__label">{t.label}</p>
                    <p className="lc-tile__value">{t.value}</p>
                    {t.note && <p className="lc-tile__note">{t.note}</p>}
                  </Reveal>
                ))}
              </div>
            </div>

            {/* GitHub Heatmap with authentic green color ramp */}
            <Reveal className="lc-card lc-heat lc--github" delay={0.2}>
              <div className="lc-heat__head">
                <p className="lc-card__label">Contributions · past year</p>
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
                  aria-label={`${ghHeatmap.contributions} contributions on ${ghHeatmap.activeDays} days in the past year`}
                  style={{ '--weeks': ghHeatmap.weeks.length }}
                >
                  <div className="lc-heat__months" aria-hidden="true">
                    {ghHeatmap.months.map((m) => (
                      <span key={m.w} style={{ gridColumn: m.w + 1 }}>
                        {m.label}
                      </span>
                    ))}
                  </div>
                  {ghHeatmap.weeks.map((col, w) => (
                    <div className="lc-heat__col" key={w} style={{ '--w': w }}>
                      {col.map((c) => (
                        <i
                          key={c.ts}
                          className={`l${c.lvl}`}
                          {...bind(
                            `${c.n ? `${c.n} contribution${c.n > 1 ? 's' : ''}` : 'No contributions'} · ${dateLabel(c.ts)}`
                          )}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        )}

        <p className="lc__note">
          Live from {isLc ? 'LeetCode' : 'GitHub'} · updated{' '}
          {new Date(activeFetchedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>
      {tooltip}
    </section>
  )
}
