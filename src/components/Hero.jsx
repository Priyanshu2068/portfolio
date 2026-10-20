import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { profile, skills, story, projects, certifications, education } from '../data'
import { on, emit, onceFired } from '../lib/bus'
import { flip, dust, useInView, usePageVisible, useReducedMotion } from '../lib/motion'
import { Timeline } from '../lib/timeline'
import Icon from './Icons'
import Bot from './Bot'
import '../styles/hero.css'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const WEEK = [38, 62, 46, 84, 70, 30, 54] // bar heights (design px / 1.2)
const TIP = 3 // which weekly bar carries the tooltip
const PHASES = ['About', 'Projects', 'Resume']
const CHIP = ['Fetching profile…', 'Sharing projects…', 'Reviewing resume…']
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const NEVER = () => new Promise(() => {})

/* ───────────────────────── storyboard engine ───────────────────────── */
function createStoryboard({ root, stage, reduced, onPhase }) {
  const $ = (k) => root.querySelector(`[data-k="${k}"]`)
  const k = {}
  ;['card', 'dk', 'docName', 'ttl', 'tlog', 'task', 'sField', 'sGo', 'cBox', 'cSend', 'prdT', 'pill',
    'm1', 'm2', 'm3', 'chip', 'chipText', 'thread', 'dark', 'sTip', 'kTip', 'prdLine'].forEach((n) => (k[n] = $(n)))
  const scenes = [...root.querySelectorAll('[data-scene]')]
  const panels = [...root.querySelectorAll('[data-panel]')]
  const skillBars = [...root.querySelectorAll('[data-skill]')]
  const weekBars = [...root.querySelectorAll('[data-week]')]

  const tl = new Timeline()
  let dead = false
  let D = 1, N = 1, boost = 12
  const fast = (yes, f) => {
    if (yes && f) boost = f
    if (!yes) boost = 12
    D = yes ? boost : 1
    N = yes ? boost : 1
    if (yes) tl.hurry(boost) // also squeeze whatever is already in flight
  }
  const sleep = (ms) => (reduced ? Promise.resolve() : tl.sleep(ms / D))
  const after = (ms, fn) => (reduced ? fn() : tl.after(ms, fn))
  let gen = 0
  const bump = () => (gen += 1)

  // typewriter
  async function type(el, text, cps = 42) {
    el.textContent = ''
    if (reduced) return void (el.textContent = text)
    const g = gen
    for (let i = 1; i <= text.length; i++) {
      await tl.sleep(1000 / (cps * N))
      if (g !== gen || dead) return NEVER()
      el.textContent = text.slice(0, i)
    }
  }
  // terminal log, line by line, with [ok]/[..] tokens tinted green
  const renderLog = (lines, n) => {
    const frag = document.createDocumentFragment()
    lines.slice(0, n).forEach((line, i) => {
      if (i) frag.append('\n')
      line.split(/(\[[^\]]+\])/).forEach((part) => {
        if (/^\[.*\]$/.test(part)) {
          const s = document.createElement('span')
          s.className = 'g'
          s.textContent = part
          frag.append(s)
        } else frag.append(part)
      })
    })
    k.tlog.replaceChildren(frag)
  }
  async function log(lines, gap = 110) {
    if (reduced) return renderLog(lines, lines.length)
    const g = gen
    for (let i = 1; i <= lines.length; i++) {
      await tl.sleep(gap / D)
      if (g !== gen || dead) return NEVER()
      renderLog(lines, i)
    }
  }

  // live wobble of numbers & bars (40ms tick), like the reference dashboard
  let scene = -1, raf = 0, sceneT0 = 0, lastTick = -1e9, settling = false
  const wobble = (s, t) => {
    if (settling) return
    const w = (a, f, ph) => a * Math.sin(t * f + ph)
    if (s === 0) {
      skillBars.forEach((b, i) => (b.style.height = `${clamp(skills[i].level + w(3, 0.6, i * 1.3), 4, 100)}%`))
    } else if (s === 1) {
      weekBars.forEach((b, i) => {
        const h = WEEK[i] + w(9, 0.31, 1.3 * i) + w(3, 0.83, 0.7 * i)
        b.style.height = `${h}%`
        if (i === TIP) {
          k.sTip.style.bottom = `calc(${h}% + 8px)`
          k.kTip.textContent = String(Math.round(18 + w(3, 0.31, 3.9)))
        }
      })
    } else {
      const pts = [[0, 30], [40, 22], [80, 26], [120, 14], [160, 18], [200, 8], [240, 12]]
      k.prdLine.setAttribute('points', pts.map(([x, y], i) => `${x},${y + 4 * Math.sin(0.29 * t + 0.9 * i) + 1.5 * Math.sin(0.9 * t + 1.7 * i)}`).join(' '))
    }
  }
  const loop = (now) => {
    raf = 0
    if (dead || scene < 0 || tl.paused) return
    if (now - lastTick > 40) {
      lastTick = now
      wobble(scene, (now - sceneT0) / 1000)
    }
    raf = requestAnimationFrame(loop)
  }
  const stopLoop = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    scene = -1
  }
  tl.onChange((paused) => {
    if (paused) {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    } else if (scene >= 0 && !reduced && !raf) raf = requestAnimationFrame(loop)
  })

  // skeleton → data for scene 0
  const zeroBars = () => skillBars.forEach((b) => (b.style.height = '0%'))
  const skeleton = () => {
    settling = true
    scenes[0].classList.add('skel')
    zeroBars()
  }
  const unskeleton = () => {
    scenes[0].classList.remove('skel')
    return sleep(80)
      .then(() => {
        skillBars.forEach((b, i) => {
          b.style.setProperty('--rd', `${70 * i}ms`)
          b.style.height = `${skills[i].level}%`
        })
        return sleep(1300)
      })
      .then(() => (settling = false))
  }

  const showScene = (s) => {
    stopLoop()
    scenes.forEach((el) => (el.hidden = true))
    if (s === 2) {
      k.prdT.textContent = story.prdTitle
      k.prdT.classList.remove('hl', 'ok')
    }
    scenes[s].hidden = false
    scene = s
    sceneT0 = performance.now() - 20000 * Math.random()
    wobble(s, (performance.now() - sceneT0) / 1000)
    if (!reduced && !tl.paused) raf = requestAnimationFrame(loop)
    k.chipText.textContent = CHIP[s]
  }
  const typeDocName = (name) => {
    if (reduced) return void (k.docName.textContent = name)
    k.ttl.classList.add('typing')
    type(k.docName, name, 30).then(() => after(450, () => k.ttl.classList.remove('typing')))
  }

  // sky lift follows the story
  let lift = 0
  const skyLift = (d, jump = false) => {
    lift = jump ? 0 : lift + d
    emit('sky:lift', { n: lift, jump })
  }

  let shown = -1
  const flipCard = (s) => {
    const dir = s > shown ? 1 : -1
    shown = s
    skyLift(dir)
    return flip(k.card, () => {
      showScene(s)
      k.docName.textContent = ''
      typeDocName(story.documents[s])
    }, dir, Math.min(D, 6), tl)
  }
  const showPanel = (p) => panels.forEach((el) => (el.hidden = el.dataset.panel !== p))
  const flipDock = (p, dir = 1, wait = 260) => sleep(wait).then(() => flip(k.dk, () => showPanel(p), dir, Math.min(D, D >= 24 ? 7 : 3.5), tl))

  const resetShare = () => {
    k.sField.textContent = story.share.placeholder
    k.sField.classList.add('ph')
    k.sGo.textContent = story.share.button
  }
  const resetThread = () => {
    ;['m1', 'm2', 'm3'].forEach((m) => k[m].classList.remove('in'))
    k.chip.classList.remove('out')
    k.thread.classList.remove('scrolled')
    k.cBox.textContent = ''
  }

  let active = -1
  const mark = (s) => {
    if (active >= 0 && s !== active) return
    onPhase(s)
  }

  // the three acts
  const acts = [
    () =>
      Promise.all([
        unskeleton(),
        type(k.task, story.prompt, 32)
          .then(() => (k.task.append(document.createElement('i')), sleep(600)))
          .then(() => ((k.task.textContent = ''), log([...story.boot, ...story.fetch], 110))),
      ]).then(() => sleep(350)),
    () => {
      mark(1)
      return Promise.all([flipCard(1), flipDock('share')])
        .then(() => sleep(500))
        .then(() => {
          k.sField.classList.remove('ph')
          return type(k.sField, story.share.typed, 30)
        })
        .then(() => sleep(300))
        .then(() => dust(k.sGo, () => (k.sGo.textContent = story.share.done), 720, tl))
        .then(() => sleep(400))
    },
    () => {
      mark(2)
      const t = k.prdT
      return Promise.all([flipCard(2), flipDock('comp')])
        .then(() => sleep(350))
        .then(() => (t.classList.add('hl'), sleep(400)))
        .then(() => (k.pill.classList.add('in'), sleep(400)))
        .then(() => type(k.cBox, story.composer, 30))
        .then(() => sleep(500))
        .then(() => (k.cSend.classList.add('hit'), sleep(380)))
        .then(() => (k.cSend.classList.remove('hit'), flipDock('thread', 1, 0)))
        .then(() => (k.m1.classList.add('in'), sleep(450)))
        .then(() => (k.m2.classList.add('in'), sleep(1200)))
        .then(() =>
          dust(t, () => {
            t.textContent = story.prdRewritten
            t.classList.remove('hl')
            t.classList.add('ok')
          }, 800, tl),
        )
        .then(() => sleep(250))
        .then(() => (k.chip.classList.add('out'), sleep(300)))
        .then(() => (k.thread.classList.add('scrolled'), k.m3.classList.add('in'), sleep(900)))
    },
  ]

  // sequencing: `done` = last finished act, `want` = where the user wants to be
  let done = 0, want = 0, running = false, ready = false, booted = false, autoTimer = null
  const clearAuto = () => (tl.clear(autoTimer), (autoTimer = null))
  const jumpReset = (s) => {
    bump()
    mark(s)
    resetShare()
    resetThread()
    k.pill.classList.remove('in')
    if (s !== 0) return Promise.resolve()
    skeleton()
    renderLog(story.boot, story.boot.length)
    k.task.textContent = ''
    const f = shown !== 0 ? flipCard(0) : Promise.resolve()
    return Promise.all([f, flipDock('term', -1, 120)]).then(() => sleep(300))
  }
  let epoch = 0
  const drive = () => {
    if (running) return
    running = true
    const mine = epoch
    const step = () => {
      if (dead || mine !== epoch) return
      if (want === done) {
        running = false
        fast(false)
        active = -1
        return scheduleAuto()
      }
      fast(false)
      let p
      if (want === done + 1) p = acts[(done += 1)]()
      else {
        const s = (done = want)
        p = jumpReset(s).then(() => acts[s]())
      }
      p.then(step)
    }
    step()
  }
  // auto-advance smoothly cycles through the 3 cards (About -> Projects -> Resume)
  const scheduleAuto = () => {
    clearAuto()
    if (reduced) return
    autoTimer = tl.after(4800, () => {
      if (!ready || running) return
      setWant((done + 1) % 3)
    })
  }
  const setWant = (s) => {
    const t = clamp(s, 0, 2)
    if (t === want) return
    clearAuto()
    want = t
    if (ready) drive()
  }
  const jumpTo = (s) => {
    if (!booted || s === want) return
    active = -1
    mark(s)
    active = s
    fast(true, 24)
    setWant(s)
  }
  // scroll position → act; whatever is still playing speeds up so the flips keep pace
  // Drop whatever act is mid-flight (typing, timers, flips, dust ghosts) so the next
  // act can start immediately; done = -9 forces a clean jumpReset to the target.
  const abort = () => {
    epoch += 1
    bump()
    tl.timers.forEach((t) => tl.clear(t))
    tl.anims.forEach((a) => a.cancel())
    root.querySelectorAll('.dust-ghost').forEach((g) => g.remove())
    root.querySelectorAll('.px-in').forEach((el) => el.classList.remove('px-in'))
    if (!ready) {
      // still booting: finish the intro state instantly
      k.dark.classList.add('in')
      stage.classList.add('is-xl')
      ready = true
    }
    running = false
    done = -9
    fast(false)
  }
  const scrollTo = (s) => {
    const t = clamp(s, 0, 2)
    if (!booted || t === want) return
    active = -1
    mark(t)
    active = t
    if (running || !ready) abort()
    want = t
    drive()
  }

  return {
    boot() {
      if (dead) return
      booted = true
      bump()
      ready = false
      running = false
      done = 0
      want = 0
      clearAuto()
      stage.classList.remove('is-on', 'is-xl')
      k.dark.classList.remove('in')
      showPanel('term')
      renderLog(story.boot, 0)
      k.task.textContent = ''
      resetShare()
      resetThread()
      k.pill.classList.remove('in')
      shown = -1
      skeleton()
      k.docName.textContent = ''
      active = -1
      mark(0)
      stopLoop()
      scenes.forEach((el) => (el.hidden = true))
      void stage.offsetWidth
      stage.classList.add('is-on')
      skyLift(0, true)
      after(650, () => ((shown = 0), showScene(0), unskeleton()))
      after(950, () => typeDocName(story.documents[0]))
      after(1500, () => k.dark.classList.add('in'))
      after(1950, () =>
        log(story.boot, 110)
          .then(() => (stage.classList.add('is-xl'), sleep(500)))
          .then(() => acts[0]())
          .then(() => {
            ready = true
            fast(false)
            want !== done ? drive() : scheduleAuto()
          }),
      )
    },
    jumpTo,
    scrollTo,
    setRunning(run) {
      run ? tl.resume() : tl.pause()
    },
    destroy() {
      dead = true
      bump()
      tl.destroy()
      stopLoop()
    },
  }
}

/* ───────────────────────────── component ───────────────────────────── */
export default function Hero() {
  const section = useRef(null)
  const root = useRef(null)
  const stage = useRef(null)
  const api = useRef(null)
  const pin = useRef(null)
  const pinApi = useRef(null)
  const [phase, setPhase] = useState(0)
  const [ready, setReady] = useState(onceFired('loader:done'))
  const reduced = useReducedMotion()
  const visible = useInView(section, { threshold: 0.05 })
  const pageVisible = usePageVisible()

  useEffect(() => on('loader:done', () => setReady(true)), [])

  // scale the fixed-size storyboard (1040×600 design units) to the viewport
  useLayoutEffect(() => {
    const el = stage.current
    const fit = () => {
      const w = el.parentElement.clientWidth
      const mobile = w < 700
      const [dw, dh] = mobile ? [560, 720] : [1040, 600]
      const s = Math.min(1, w / dw)
      el.classList.toggle('is-m', mobile)
      el.style.setProperty('--s', s)
      el.parentElement.style.height = `${dh * s}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const sb = createStoryboard({ root: root.current, stage: stage.current, reduced, onPhase: setPhase })
    api.current = sb
    const off = on('loader:done', () => sb.boot())
    if (onceFired('loader:done')) sb.boot()
    return () => {
      off()
      sb.destroy()
      api.current = null
    }
  }, [reduced])

  // Pin the hero while the page scrolls past it (position: sticky, so scrolling is never
  // blocked). Two stretches of scroll flip the card to act 2 and act 3; scrolling back up
  // flips it back.
  useLayoutEffect(() => {
    const wrap = pin.current
    const hero = section.current
    const copy = hero.querySelector('.hero__copy')
    let heroH = 0, flip = 0, raf = 0, settle = 0
    const pinStart = () => Math.max(0, heroH - innerHeight) // pins once the hero's bottom reaches the viewport's
    const update = () => {
      raf = 0
      const scrolled = -wrap.getBoundingClientRect().top
      // the headline fades out as the card takes over, so nothing sits half-hidden under the nav
      const fade = clamp(1 - scrolled / (pinStart() + flip * 0.4), 0, 1)
      copy.style.opacity = fade < 1 ? fade.toFixed(3) : ''
      copy.style.pointerEvents = fade < 0.2 ? 'none' : ''
      const p = clamp((scrolled - pinStart()) / (2 * flip), 0, 1)
      const act = p < 0.25 ? 0 : p < 0.75 ? 1 : 2
      // commit once the scroll settles, so acts you fly past (or a smooth scroll crosses) don't play
      clearTimeout(settle)
      settle = setTimeout(() => api.current?.scrollTo(act), 120)
    }
    const measure = () => {
      heroH = hero.offsetHeight
      flip = Math.round(innerHeight * 0.6)
      wrap.style.height = `${heroH + 2 * flip}px`
      // stretch the sky behind the hero by the pinned distance so the card keeps its backdrop
      document.documentElement.style.setProperty('--hero-pin-extra', `${2 * flip}px`)
      hero.style.top = `${Math.min(0, innerHeight - heroH)}px`
      update()
    }
    const onScroll = () => raf || (raf = requestAnimationFrame(update))
    pinApi.current = {
      goTo(i) {
        const top = wrap.getBoundingClientRect().top + scrollY + pinStart() + i * flip
        scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
      },
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(hero)
    addEventListener('resize', measure)
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      clearTimeout(settle)
      removeEventListener('resize', measure)
      removeEventListener('scroll', onScroll)
    }
  }, [reduced])

  const [inHeroZone, setInHeroZone] = useState(true)
  useEffect(() => {
    const check = () => setInHeroZone(scrollY < 1400)
    check()
    addEventListener('scroll', check, { passive: true })
    return () => removeEventListener('scroll', check)
  }, [])

  useEffect(() => {
    api.current?.setRunning((visible || inHeroZone) && pageVisible)
  }, [visible, inHeroZone, pageVisible, reduced])

  return (
    <div className="hero-pin" ref={pin}>
    <section className={`hero ${ready ? 'is-ready' : ''}`} id="top" ref={section}>
      <div className="hero__copy">
        <h1 className="hero__title">
          {profile.headline.map((l, i) => (
            <span className="line" key={i}>
              <span style={{ '--d': `${0.15 + i * 0.12}s` }}>{l}</span>
            </span>
          ))}
        </h1>
        <p className="hero__sub blur-in" style={{ '--d': '.45s' }}>{profile.intro}</p>
        <div className="hero__ctas blur-in" style={{ '--d': '.6s' }}>
          <a className="btn btn--blue" href={profile.resume} download>
            Download Resume <Icon name="download" size={18} />
          </a>
          <a className="btn btn--glass" href="#contact">
            Let’s connect <Icon name="arrow" size={18} />
          </a>
        </div>
        <p className="hero__tag blur-in" style={{ '--d': '.75s' }}>
          {profile.tagline.map((t, i) => (
            <span key={t}>
              {i > 0 && <i>·</i>}
              {t}
            </span>
          ))}
        </p>
      </div>

      <div className="stage-wrap" ref={root}>
        <div className="stage" ref={stage}>
          {/* ── main window: flips between the three scenes ── */}
          <div className="stage__card-wrap">
            <div className="win" data-k="card">
              <div className="win__bar">
                <span className="win__dots"><i /><i /><i /></span>
                <span className="win__path" data-k="ttl">
                  <b>{profile.handle}</b> / <span data-k="docName" />
                  <span className="caret" />
                </span>
                <span className="win__icons">
                  <Icon name="share" size={15} />
                  <Icon name="comment" size={15} />
                  <span className="win__avatar">{profile.name[0]}</span>
                </span>
              </div>

              {/* scene 0 — profile + skills */}
              <div className="scene scene--about skel" data-scene="0" hidden>
                <aside className="side">
                  {['terminal', 'globe', 'badge', 'mail'].map((n) => <Icon key={n} name={n} size={16} />)}
                </aside>
                <div className="about-card">
                  <div className="about-card__head">
                    <div className="about-card__avatar">{profile.name[0]}</div>
                    <div>
                      <p className="sk sk--name">{profile.fullName}</p>
                      <p className="sk sk--role">{profile.role}</p>
                      <p className="sk sk--loc"><Icon name="globe" size={12} /> {profile.location}</p>
                    </div>
                    <span className="about-card__badge"><span className="dot-live" /> open to work</span>
                  </div>
                  <p className="about-card__label">Stack · tools per area</p>
                  <div className="skills-chart">
                    {skills.map((s) => (
                      <div className="skills-chart__col" key={s.name}>
                        <div className="skills-chart__track">
                          <div className="skills-chart__bar" data-skill />
                        </div>
                        <span>{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* scene 1 — dashboard */}
              <div className="scene scene--dash" data-scene="1" hidden>
                <aside className="side">
                  {['terminal', 'globe', 'badge', 'mail'].map((n) => <Icon key={n} name={n} size={16} />)}
                </aside>
                <div className="dash">
                  <div className="dash__kpis">
                    <div className="kpi kpi--blue"><span>Projects shipped</span><b>{projects.length}</b></div>
                    <div className="kpi"><span>Certifications</span><b>{certifications.length}</b></div>
                    <div className="kpi"><span>MCA score</span><b>{parseFloat(education[0].score)}%</b></div>
                    <div className="kpi"><span>Live demos</span><b>{projects.filter((p) => p.live).length}</b></div>
                  </div>
                  <div className="dash__chart">
                    <div className="dash__chart-head"><span>Build activity</span><em>illustrative</em></div>
                    <div className="week">
                      {DAYS.map((d, i) => (
                        <div className="week__col" key={i}>
                          <div className="week__bar" data-week style={{ height: `${WEEK[i]}%` }} />
                          <span>{d}</span>
                        </div>
                      ))}
                      <div className="week__tip" data-k="sTip" style={{ left: `calc(${(TIP + 0.5) * (100 / 7)}% )` }}>
                        <b data-k="kTip">18</b> commits
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* scene 2 — resume document */}
              <div className="scene scene--doc" data-scene="2" hidden>
                <div className="doc">
                  <p className="doc__eyebrow">Document</p>
                  <h3 className="doc__title" data-k="prdT">{story.prdTitle}</h3>
                  <span className="doc__pill" data-k="pill"><Icon name="comment" size={12} /> 1 comment</span>
                  <div className="doc__cols">
                    <div>
                      <p className="doc__h">Education</p>
                      {education.slice(0, 3).map((e) => (
                        <p className="doc__row" key={e.title}><b>{e.title}</b><span>{e.school} · {e.score}</span></p>
                      ))}
                    </div>
                    <div>
                      <p className="doc__h">Momentum</p>
                      <svg viewBox="-4 0 248 40" className="doc__spark">
                        <polyline data-k="prdLine" points="0,30 40,22 80,26 120,14 160,18 200,8 240,12" />
                      </svg>
                      <div className="doc__lines"><i /><i /><i style={{ width: '60%' }} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── dark dock: flips between terminal / share / composer / thread ── */}
          <div className="stage__dock-wrap dark-in" data-k="dark">
            <div className="dock" data-k="dk">
              <div className="dock__panel term" data-panel="term">
                <p className="dock__head"><span className="win__dots"><i /><i /><i /></span> zsh — {profile.handle}</p>
                <pre className="term__log" data-k="tlog" />
                <p className="term__line"><span className="g">➜</span> ~ <span data-k="task" /></p>
              </div>
              <div className="dock__panel share" data-panel="share" hidden>
                <p className="dock__head">Share “projects.html”</p>
                <div className="share__row">
                  <span className="share__field ph" data-k="sField" />
                  <button className="share__go" data-k="sGo" tabIndex={-1}>Send</button>
                </div>
                <p className="share__label">People with access</p>
                <div className="share__people">
                  <span className="pp" style={{ background: '#0039ff' }}>{profile.name[0]}</span>
                  <span className="pp" style={{ background: '#5A7FFF' }}>L</span>
                  <span className="pp" style={{ background: '#8a8a90' }}>I</span>
                  <em>Anyone with the link can view</em>
                </div>
              </div>
              <div className="dock__panel comp" data-panel="comp" hidden>
                <p className="dock__head">Comment on selection</p>
                <div className="comp__box"><span data-k="cBox" /><span className="caret" /></div>
                <div className="comp__foot">
                  <span>@agent</span>
                  <button className="comp__send" data-k="cSend" tabIndex={-1}><Icon name="send" size={14} /></button>
                </div>
              </div>
              <div className="dock__panel thread" data-panel="thread" hidden>
                <p className="dock__head">Thread</p>
                <div className="thread__list" data-k="thread">
                  {story.thread.map((m, i) => (
                    <div className={`msg ${m.bot ? 'msg--bot' : ''}`} data-k={`m${i + 1}`} key={i}>
                      {m.bot ? <Bot size={22} /> : <span className="pp pp--sm">Y</span>}
                      <div><b>{m.who}</b><p>{m.text}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── floating agent chip ── */}
          <div className="agent-chip" data-k="chip">
            <Bot size={30} />
            <div>
              <b>{profile.name}’s agent</b>
              <p><span className="spark-alt"><Icon name="spark" size={10} /><Icon name="spark" size={10} /></span> <span data-k="chipText">{CHIP[0]}</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="hero__dots" role="tablist" aria-label="Story">
        {PHASES.map((p, i) => (
          <button
            key={p}
            role="tab"
            aria-selected={phase === i}
            className={phase === i ? 'is-active' : ''}
            onClick={() => pinApi.current?.goTo(i)}
          >
            <i />
            {p}
          </button>
        ))}
        <span className="hero__hint">Scroll to explore</span>
      </div>
    </section>
    </div>
  )
}
