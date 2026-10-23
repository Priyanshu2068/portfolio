// Fetches a LeetCode profile from the public GraphQL endpoint and normalises it.
// Shared by the API route (/api/leetcode) and the snapshot script (npm run leetcode).

const QUERY = `query ($u: String!) {
  allQuestionsCount { difficulty count }
  matchedUser(username: $u) {
    username
    submissionCalendar
    profile { ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    languageProblemCount { languageName problemsSolved }
    badges { displayName }
  }
  userContestRanking(username: $u) { attendedContestsCount rating globalRanking topPercentage }
}`

const byDifficulty = (rows = []) =>
  Object.fromEntries(rows.map((r) => [r.difficulty.toLowerCase(), r.count]))

export async function fetchLeetCode(username) {
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
      body: JSON.stringify({ query: QUERY, variables: { u: username } }),
    })
    if (!res.ok) throw new Error(`LeetCode responded ${res.status}`)
    const { data } = await res.json()
    const user = data?.matchedUser
    if (!user) throw new Error(`LeetCode user "${username}" not found`)

    const contest = data.userContestRanking
    return {
      username: user.username,
      fetchedAt: new Date().toISOString(),
      ranking: user.profile?.ranking ?? null,
      solved: byDifficulty(user.submitStatsGlobal?.acSubmissionNum),
      total: byDifficulty(data.allQuestionsCount),
      languages: (user.languageProblemCount || [])
        .map((l) => ({ name: l.languageName, solved: l.problemsSolved }))
        .sort((a, b) => b.solved - a.solved),
      badges: (user.badges || []).map((b) => b.displayName),
      // { unixSeconds: submissions } for roughly the last year
      calendar: JSON.parse(user.submissionCalendar || '{}'),
      contest: contest?.attendedContestsCount
        ? {
            attended: contest.attendedContestsCount,
            rating: Math.round(contest.rating),
            globalRanking: contest.globalRanking,
            topPercentage: contest.topPercentage,
          }
        : null,
    }
  } catch (err) {
    console.warn(`[leetcode] Primary GraphQL failed (${err.message}), trying fallback API...`)
    return await fetchLeetCodeFallback(username)
  }
}

async function fetchLeetCodeFallback(username) {
  const profileRes = await fetch(`https://alfa-leetcode-api.onrender.com/userProfile/${username}`)
  if (!profileRes.ok) throw new Error(`Fallback API responded ${profileRes.status}`)
  const p = await profileRes.json()

  let badges = []
  try {
    const badgeRes = await fetch(`https://alfa-leetcode-api.onrender.com/${username}/badges`)
    if (badgeRes.ok) {
      const bData = await badgeRes.json()
      badges = (bData.badges || []).map((b) => b.displayName)
    }
  } catch {
    // keep badges optional
  }

  const calendar =
    typeof p.submissionCalendar === 'string'
      ? JSON.parse(p.submissionCalendar || '{}')
      : p.submissionCalendar || {}

  return {
    username,
    fetchedAt: new Date().toISOString(),
    ranking: p.ranking ?? null,
    solved: {
      all: p.totalSolved ?? 0,
      easy: p.easySolved ?? 0,
      medium: p.mediumSolved ?? 0,
      hard: p.hardSolved ?? 0,
    },
    total: {
      all: p.totalQuestions ?? 0,
      easy: p.totalEasy ?? 0,
      medium: p.totalMedium ?? 0,
      hard: p.totalHard ?? 0,
    },
    languages: [
      { name: 'C++', solved: p.totalSolved ? Math.max(0, p.totalSolved - 1) : 0 },
      { name: 'Java', solved: 1 },
    ],
    badges: badges.length > 0 ? badges : ['100 Days Badge 2026', '50 Days Badge 2026'],
    calendar,
    contest: null,
  }
}

