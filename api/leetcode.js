import { fetchLeetCode } from '../server/leetcode.js'

const LEETCODE_USER = process.env.LEETCODE_USER || 'priyanshu2068'
let leetcodeCache = { at: 0, data: null }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Cache at CDN edge for 1 hour, stale-while-revalidate for 2 hours
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')

  if (leetcodeCache.data && Date.now() - leetcodeCache.at < 6 * 60 * 60 * 1000) {
    return res.status(200).json(leetcodeCache.data)
  }

  try {
    const data = await fetchLeetCode(LEETCODE_USER)
    leetcodeCache = { at: Date.now(), data }
    return res.status(200).json(data)
  } catch (err) {
    console.warn('[leetcode]', err.message)
    if (leetcodeCache.data) return res.status(200).json(leetcodeCache.data)
    return res.status(502).json({ ok: false, error: 'LeetCode is unavailable right now.' })
  }
}
