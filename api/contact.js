import nodemailer from 'nodemailer'

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const { name = '', email = '', subject = '', message = '', company = '' } = req.body || {}

  if (company) return res.status(200).json({ ok: true })

  const n = String(name).trim()
  const e = String(email).trim()
  const s = String(subject).trim() || 'New message from your portfolio'
  const m = String(message).trim()

  if (n.length < 2 || n.length > 100) return res.status(400).json({ ok: false, error: 'Please enter your name.' })
  if (!isEmail(e)) return res.status(400).json({ ok: false, error: 'Please enter a valid email.' })
  if (m.length < 10 || m.length > 5000)
    return res.status(400).json({ ok: false, error: 'Message should be 10–5000 characters.' })

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  if (limited(clientIp)) return res.status(429).json({ ok: false, error: 'Too many messages. Try again later.' })

  const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  if (!smtpReady) return res.status(503).json({ ok: false, error: 'Mail service is not configured yet.' })

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

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

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[mail] send failed:', err.message)
    res.status(500).json({ ok: false, error: 'Could not send right now. Please email me directly.' })
  }
}
