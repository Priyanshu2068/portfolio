import { fetchGitHub } from '../server/github.js'

const GITHUB_USER = process.env.GITHUB_USER || 'Priyanshu2068'
let githubCache = { at: 0, data: null }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Cache at CDN edge for 30 minutes, stale-while-revalidate for 1 hour
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')

  if (githubCache.data && Date.now() - githubCache.at < 30 * 60 * 1000) {
    return res.status(200).json(githubCache.data)
  }

  try {
    const data = await fetchGitHub(GITHUB_USER)
    githubCache = { at: Date.now(), data }
    return res.status(200).json(data)
  } catch (err) {
    console.warn('[github]', err.message)
    if (githubCache.data) return res.status(200).json(githubCache.data)
    return res.status(502).json({ ok: false, error: 'GitHub is unavailable right now.' })
  }
}
