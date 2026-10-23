// Saves a GitHub snapshot the site uses when the live API is unavailable. Run: npm run github
import fs from 'node:fs'

const username = process.argv[2] || 'Priyanshu2068'
const out = new URL('../src/github-snapshot.json', import.meta.url)

async function fetchGitHub(user) {
  const [cRes, uRes, rRes] = await Promise.all([
    fetch(`https://github-contributions-api.jogruber.de/v4/${user}?y=last`),
    fetch(`https://api.github.com/users/${user}`, { headers: { 'User-Agent': 'portfolio' } }),
    fetch(`https://api.github.com/users/${user}/repos?per_page=100`, { headers: { 'User-Agent': 'portfolio' } }),
  ])

  if (!cRes.ok) throw new Error(`Contributions API returned ${cRes.status}`)
  const cData = await cRes.json()
  const uData = uRes.ok ? await uRes.json() : {}
  const repos = rRes.ok ? await rRes.json() : []

  const days = cData.contributions || []
  let activeDays = 0
  let maxDay = 0
  let longestStreak = 0
  let tempStreak = 0

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

  let currentStreak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) currentStreak++
    else if (i === days.length - 1) continue
    else break
  }

  const langs = {}
  for (const r of (Array.isArray(repos) ? repos : [])) {
    if (r.language) {
      langs[r.language] = (langs[r.language] || 0) + 1
    }
  }

  return {
    username: user,
    fetchedAt: new Date().toISOString(),
    totalContributions: cData.total?.lastYear ?? 0,
    publicRepos: uData.public_repos ?? (Array.isArray(repos) ? repos.length : 10),
    followers: uData.followers ?? 2,
    activeDays,
    longestStreak,
    currentStreak,
    maxDay,
    languages: Object.entries(langs)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    calendar: calendarMap,
  }
}

const data = await fetchGitHub(username)
fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n')
console.log(`Saved ${data.totalContributions} contributions / ${data.publicRepos} repos for ${data.username}`)
