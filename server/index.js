import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fetchLeetCode } from './leetcode.js'
import { fetchGitHub } from './github.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 5000

app.use(express.json({ limit: '32kb' }))
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  }),
)

// ---------- SMTP transport ----------
const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

const transporter = smtpReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null

if (transporter) {
  transporter
    .verify()
    .then(() => console.log('[mail] SMTP connection verified'))
    .catch((err) => console.warn('[mail] SMTP verify failed:', err.message))
} else {
  console.warn('[mail] SMTP not configured — copy .env.example to .env and fill it in.')
}

// ---------- tiny in-memory rate limit: 5 messages / 15 min / IP ----------
const hits = new Map()
const WINDOW = 15 * 60 * 1000
function limited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW)
  list.push(now)
  hits.set(ip, list)
  return list.length > 5
}

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)

app.get('/api/health', (_req, res) => res.json({ ok: true, smtp: smtpReady }))

// ---------- LeetCode stats (cached for 6 hours) ----------
const LEETCODE_USER = process.env.LEETCODE_USER || 'priyanshu2068'
let leetcodeCache = { at: 0, data: null }
app.get('/api/leetcode', async (_req, res) => {
  if (leetcodeCache.data && Date.now() - leetcodeCache.at < 6 * 60 * 60 * 1000) return res.json(leetcodeCache.data)
  try {
    leetcodeCache = { at: Date.now(), data: await fetchLeetCode(LEETCODE_USER) }
    res.json(leetcodeCache.data)
  } catch (err) {
    console.warn('[leetcode]', err.message)
    if (leetcodeCache.data) return res.json(leetcodeCache.data) // stale beats nothing
    res.status(502).json({ ok: false, error: 'LeetCode is unavailable right now.' })
  }
})

// ---------- GitHub stats (cached for 60 seconds) ----------
const GITHUB_USER = process.env.GITHUB_USER || 'Priyanshu2068'
let githubCache = { at: 0, data: null }
app.get('/api/github', async (req, res) => {
  const forceRefresh = req.query?.refresh === '1' || req.query?.refresh === 'true'
  if (!forceRefresh && githubCache.data && Date.now() - githubCache.at < 60 * 1000) return res.json(githubCache.data)
  try {
    githubCache = { at: Date.now(), data: await fetchGitHub(GITHUB_USER) }
    res.json(githubCache.data)
  } catch (err) {
    console.warn('[github]', err.message)
    if (githubCache.data) return res.json(githubCache.data)
    res.status(502).json({ ok: false, error: 'GitHub is unavailable right now.' })
  }
})

app.post('/api/contact', async (req, res) => {
  const { name = '', email = '', subject = '', message = '', company = '' } = req.body || {}

  // honeypot — real users never fill the hidden "company" field
  if (company) return res.json({ ok: true })

  const n = String(name).trim()
  const e = String(email).trim()
  const s = String(subject).trim() || 'New message from your portfolio'
  const m = String(message).trim()

  if (n.length < 2 || n.length > 100) return res.status(400).json({ ok: false, error: 'Please enter your name.' })
  if (!isEmail(e)) return res.status(400).json({ ok: false, error: 'Please enter a valid email.' })
  if (m.length < 10 || m.length > 5000)
    return res.status(400).json({ ok: false, error: 'Message should be 10–5000 characters.' })
  if (limited(req.ip)) return res.status(429).json({ ok: false, error: 'Too many messages. Try again later.' })
  if (!transporter) return res.status(503).json({ ok: false, error: 'Mail service is not configured yet.' })

  const from = process.env.MAIL_FROM || process.env.SMTP_USER
  const to = process.env.MAIL_TO || process.env.SMTP_USER

  try {
    await transporter.sendMail({
      from,
      to,
      replyTo: `${n} <${e}>`,
      subject: `[Portfolio] ${s}`,
      text: `From: ${n} <${e}>\n\n${m}`,
      html: `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#111">
        <p style="margin:0 0 4px;color:#0039ff;font-weight:600">New portfolio message</p>
        <p style="margin:0 0 16px"><b>${escape(n)}</b> &lt;${escape(e)}&gt;</p>
        <p style="margin:0 0 8px"><b>${escape(s)}</b></p>
        <p style="white-space:pre-wrap;margin:0">${escape(m)}</p></div>`,
    })

    if (String(process.env.AUTO_REPLY ?? 'true') === 'true') {
      await transporter
        .sendMail({
          from,
          to: e,
          subject: 'Thanks for reaching out!',
          text: `Hi ${n},\n\nThanks for your message — I've received it and will get back to you soon.\n\n— Priyanshu Tripathi`,
        })
        .catch((err) => console.warn('[mail] auto-reply failed:', err.message))
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('[mail] send failed:', err.message)
    res.status(500).json({ ok: false, error: 'Could not send right now. Please email me directly.' })
  }
})

// ---------- serve the built site in production ----------
const dist = path.resolve(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`))
