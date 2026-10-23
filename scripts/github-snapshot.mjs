// Saves a GitHub snapshot the site uses when the live API is unavailable. Run: npm run github
import fs from 'node:fs'
import { fetchGitHub } from '../server/github.js'

const username = process.argv[2] || 'Priyanshu2068'
const out = new URL('../src/github-snapshot.json', import.meta.url)
const data = await fetchGitHub(username)
fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n')
console.log(`Saved ${data.totalContributions} contributions / ${data.publicRepos} repos for ${data.username}`)
