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

  // Cache at CDN edge for 60 seconds, stale-while-revalidate for 2 minutes
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')

  const forceRefresh = req.query?.refresh === '1' || req.query?.refresh === 'true'

  if (!forceRefresh && githubCache.data && Date.now() - githubCache.at < 60 * 1000) {
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
