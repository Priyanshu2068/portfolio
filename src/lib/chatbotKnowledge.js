import { profile, projects, skillGroups, education, certifications, faqs } from '../data.js'
import lcSnapshot from '../leetcode-snapshot.json'
import ghSnapshot from '../github-snapshot.json'

export const QUICK_PROMPTS = [
  { label: '🚀 Top Projects', prompt: 'Tell me about your top projects' },
  { label: '💼 Tech Stack', prompt: 'What technologies and skills do you use?' },
  { label: '💻 LeetCode & GitHub', prompt: 'What are your LeetCode and GitHub stats?' },
  { label: '🎓 Education', prompt: 'Tell me about your educational background' },
  { label: '📄 Resume', prompt: 'How can I view or download your resume?' },
  { label: '✉️ Contact Priyanshu', prompt: 'How do I get in touch with you?' },
]

export function getBotResponse(rawQuery) {
  const q = (rawQuery || '').trim().toLowerCase()
  if (!q) {
    return {
      text: "I didn't quite catch that. You can ask me about Priyanshu's projects, skills, education, problem solving, or work availability!",
      actions: [],
    }
  }

  // 1. Greetings
  if (/^(hi|hello|hey|hola|namaste|greetings|howdy|sup|who are you|what can you do)/i.test(q)) {
    return {
      text: `Hello! 👋 I'm **Priyanshu's AI Assistant**.\n\nPriyanshu is a **Full-Stack Developer** and MCA student at ABES Engineering College, building high-performance REST APIs, database-driven web apps, and AI workflows with React, Node.js, Express, MongoDB, and AWS.\n\nWhat would you like to explore?`,
      actions: [
        { label: 'View Projects', href: '#projects' },
        { label: 'Download Resume', href: profile.resume, download: true },
        { label: 'Contact', href: '#contact' },
      ],
    }
  }

  // 2. Resume / CV
  if (/resume|cv|biodata|download resume/i.test(q)) {
    return {
      text: `You can download Priyanshu's latest resume directly or inspect his qualifications, education, and credentials right here on this portfolio!`,
      actions: [
        { label: '📄 Download Resume (PDF)', href: profile.resume, download: true },
        { label: 'View Experience', href: '#experience' },
        { label: 'View Education', href: '#education' },
      ],
    }
  }

  // 3. Hire / Job / Internship / Availability
  if (/hire|job|intern|internship|available|opportunity|looking for|full time|part time|open to work/i.test(q)) {
    return {
      text: `**Yes, Priyanshu is actively open to work!** 🎯\n\nHe is looking for **Software Development Internships** and **Entry-Level Full-Stack / Backend / Cloud Roles**.\n\nKey highlights:\n• Strong foundations in Data Structures & C++ (217+ solved on LeetCode)\n• Production full-stack apps with React, Node.js, Express, MongoDB\n• Cloud certified (NPTEL Cloud Computing Elite 85% & AWS)\n• Available to join immediately.`,
      actions: [
        { label: '✉️ Send Message', href: '#contact' },
        { label: '📄 Download Resume', href: profile.resume, download: true },
        { label: 'LinkedIn', href: 'https://www.linkedin.com/in/priyanshu2068/', external: true },
      ],
    }
  }

  // 4. Specific Projects
  if (/finance|advisor|ai personal finance/i.test(q)) {
    const p = projects.find((x) => x.title.includes('Finance'))
    return {
      text: `**${p.title}**\n\n${p.blurb}\n\n**Key Highlights:**\n${p.highlights.map((h) => `• ${h}`).join('\n')}\n\n**Tech Stack:** ${p.tech.join(', ')}`,
      actions: [
        { label: 'View in Projects', href: '#projects' },
        { label: 'Contact for Demo', href: '#contact' },
      ],
    }
  }

  if (/webhook|webhook manager/i.test(q)) {
    const p = projects.find((x) => x.title.includes('Webhook'))
    return {
      text: `**${p.title}**\n\n${p.blurb}\n\n**Key Highlights:**\n${p.highlights.map((h) => `• ${h}`).join('\n')}\n\n**Tech Stack:** ${p.tech.join(', ')}`,
      actions: [
        { label: 'GitHub Code', href: p.github, external: true },
        { label: 'View in Projects', href: '#projects' },
      ],
    }
  }

  if (/prepare|prepare\.ai|quiz|interview prep/i.test(q)) {
    const p = projects.find((x) => x.title.includes('Prepare'))
    return {
      text: `**${p.title}**\n\n${p.blurb}\n\n**Key Highlights:**\n${p.highlights.map((h) => `• ${h}`).join('\n')}\n\n**Tech Stack:** ${p.tech.join(', ')}`,
      actions: [
        { label: '🚀 Live App', href: p.live, external: true },
        { label: 'GitHub Repo', href: p.github, external: true },
      ],
    }
  }

  if (/voyager|travel|hotel|booking/i.test(q)) {
    const p = projects.find((x) => x.title.includes('Voyager'))
    return {
      text: `**${p.title}**\n\n${p.blurb}\n\n**Key Highlights:**\n${p.highlights.map((h) => `• ${h}`).join('\n')}\n\n**Tech Stack:** ${p.tech.join(', ')}`,
      actions: [
        { label: '🚀 Live Demo', href: p.live, external: true },
        { label: 'GitHub Repo', href: p.github, external: true },
      ],
    }
  }

  if (/fitpulse|fitness|tracker|health/i.test(q)) {
    const p = projects.find((x) => x.title.includes('FitPulse'))
    return {
      text: `**${p.title}**\n\n${p.blurb}\n\n**Key Highlights:**\n${p.highlights.map((h) => `• ${h}`).join('\n')}\n\n**Tech Stack:** ${p.tech.join(', ')}`,
      actions: [
        { label: '🚀 Live Demo', href: p.live, external: true },
        { label: 'GitHub Repo', href: p.github, external: true },
      ],
    }
  }

  // 5. All Projects general query
  if (/projects?|portfolio items|what did (you|he) build|applications?|apps/i.test(q)) {
    const list = projects.map((p) => `• **${p.title}** (${p.tech.slice(0, 3).join(', ')}) — ${p.blurb}`).join('\n\n')
    return {
      text: `Here are Priyanshu's featured projects:\n\n${list}\n\nYou can click below to explore live demos and source code!`,
      actions: [
        { label: 'Explore Projects Section', href: '#projects' },
        { label: 'GitHub Repositories', href: 'https://github.com/Priyanshu2068', external: true },
      ],
    }
  }

  // 6. Skills & Tech Stack
  if (/skills?|tech|stack|technologies|languages?|frameworks?|libraries|tools|database/i.test(q)) {
    const groups = skillGroups.map((g) => `• **${g.name}:** ${g.items.join(', ')}`).join('\n')
    return {
      text: `Here is Priyanshu's complete technical toolkit:\n\n${groups}\n\nHe is especially proficient in **React, Node.js, Express, MongoDB, C++, and AWS cloud services**.`,
      actions: [
        { label: 'View Skills in About', href: '#about' },
        { label: 'See Projects', href: '#projects' },
      ],
    }
  }

  // 7. LeetCode, DSA, Problem Solving
  if (/leetcode|dsa|data structures|algorithms|problem solving|ranking|solved/i.test(q)) {
    const solved = lcSnapshot.solved?.all ?? 217
    const easy = lcSnapshot.solved?.easy ?? 111
    const med = lcSnapshot.solved?.medium ?? 91
    const hard = lcSnapshot.solved?.hard ?? 15
    const rank = lcSnapshot.ranking ? `#${lcSnapshot.ranking.toLocaleString()}` : '#792k'

    return {
      text: `**LeetCode Stats (@priyanshu2068):**\n\n• **Total Problems Solved:** ${solved} (Easy: ${easy}, Medium: ${med}, Hard: ${hard})\n• **Global Ranking:** ${rank}\n• **Primary Language:** C++ (216+ solved)\n• **Badges:** 100 Days Badge, 50 Days Badge\n\nHe practices data structures and algorithms consistently every day!`,
      actions: [
        { label: 'Interactive LeetCode Section', href: '#leetcode' },
        { label: 'LeetCode Profile', href: 'https://leetcode.com/u/priyanshu2068/', external: true },
      ],
    }
  }

  // 8. GitHub & Open Source
  if (/github|git|contributions|commits|repos|open source/i.test(q)) {
    const contrib = ghSnapshot.totalContributions ?? 81
    const repos = ghSnapshot.publicRepos ?? 10
    return {
      text: `**GitHub Activity (@Priyanshu2068):**\n\n• **Contributions (Past Year):** ${contrib}+\n• **Public Repositories:** ${repos}\n• **Active Days:** ${ghSnapshot.activeDays ?? 24} days\n• **Top Languages:** JavaScript, HTML, CSS, C++\n\nYou can inspect his real-time contribution heatmap in the Activity section!`,
      actions: [
        { label: 'View Activity Heatmap', href: '#leetcode' },
        { label: 'Open GitHub Profile', href: 'https://github.com/Priyanshu2068', external: true },
      ],
    }
  }

  // 9. Education & Academics
  if (/education|college|university|degree|mca|bca|grades?|cgpa|score|study|studying/i.test(q)) {
    const eduList = education
      .map((e) => `• **${e.title}**\n  ${e.school} (${e.period}) — **${e.score}**`)
      .join('\n\n')
    return {
      text: `**Educational Background:**\n\n${eduList}\n\nPriyanshu maintains a **90.45%** aggregate in his MCA at ABES Engineering College.`,
      actions: [
        { label: 'View Education Section', href: '#education' },
        { label: 'Certifications', href: '#certifications' },
      ],
    }
  }

  // 10. Certifications
  if (/certif|certificate|credential|nptel|udemy|cisco|hackerrank|aws practitioner/i.test(q)) {
    const certs = certifications.map((c) => `• **${c.title}** (${c.issuer}) — ${c.date}`).join('\n')
    return {
      text: `**Certifications & Credentials:**\n\n${certs}\n\nNotably, he scored **85% (Elite)** in the 12-week NPTEL Cloud Computing course conducted by IIT Kharagpur!`,
      actions: [
        { label: 'View Certifications Section', href: '#certifications' },
      ],
    }
  }

  // 11. Contact Info
  if (/contact|email|phone|reach|message|touch|linkedin|call|talk/i.test(q)) {
    return {
      text: `Here is how you can reach Priyanshu:\n\n• **Email:** [${profile.email}](mailto:${profile.email})\n• **Phone:** ${profile.phone}\n• **LinkedIn:** [linkedin.com/in/priyanshu2068](https://www.linkedin.com/in/priyanshu2068/)\n• **Location:** ${profile.location}\n\nYou can also submit the quick contact form on this website directly!`,
      actions: [
        { label: 'Open Contact Form', href: '#contact' },
        { label: 'Email Priyanshu', href: `mailto:${profile.email}`, external: true },
      ],
    }
  }

  // 12. About Priyanshu / Bio
  if (/about|who is priyanshu|biography|background|summary/i.test(q)) {
    return {
      text: `**About Priyanshu Tripathi:**\n\n${profile.about.body}\n\n**Core pillars:**\n${profile.about.points.map((p) => `• **${p.title}:** ${p.text}`).join('\n')}`,
      actions: [
        { label: 'Read Full About Section', href: '#about' },
        { label: 'Check Projects', href: '#projects' },
      ],
    }
  }

  // 13. Smart Fallback with suggestions
  return {
    text: `I'm tuned specifically to answer questions about **Priyanshu Tripathi's portfolio**, software engineering background, and projects.\n\nHere are some things you can ask me:\n• *"What projects has he built?"*\n• *"What is his tech stack and cloud skills?"*\n• *"How many problems has he solved on LeetCode?"*\n• *"What is his educational background?"*\n• *"Is he open to job or internship opportunities?"*`,
    actions: [
      { label: '🚀 Explore Projects', href: '#projects' },
      { label: '✉️ Get in Touch', href: '#contact' },
      { label: '📄 Download Resume', href: profile.resume, download: true },
    ],
  }
}
