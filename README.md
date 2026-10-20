<div align="center">

# 🌐 Priyanshu Tripathi — Developer Portfolio

[![Portfolio Live](https://img.shields.io/badge/Portfolio-Live%20Demo-0039ff?style=for-the-badge&logo=vercel&logoColor=white)](https://github.com/Priyanshu2068/portfolio)
[![GitHub](https://img.shields.io/badge/GitHub-Priyanshu2068-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Priyanshu2068)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-priyanshu2068-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/priyanshu2068/)
[![LeetCode](https://img.shields.io/badge/LeetCode-priyanshu2068-FFA116?style=for-the-badge&logo=leetcode&logoColor=white)](https://leetcode.com/u/priyanshu2068/)

<p align="center">
  <strong>High-performance, motion-driven portfolio inspired by modern developer tooling aesthetics.</strong><br>
  Built with <b>React 19</b>, <b>Three.js WebGL</b>, <b>GLSL Shaders</b>, and an <b>Express + Nodemailer API</b>.
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-featured-projects">Featured Projects</a> •
  <a href="#-project-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-contact">Contact</a>
</p>

---

</div>

## ✨ Key Features

- **Interactive 3D Twisted Möbius Ring** — Custom Three.js geometry with dynamic GLSL vertex & fragment shaders sweeping electric-blue pulses across a twisted ribbon loop.
- **Dynamic GLSL Sky Shader** — Real-time WebGL canvas calculating 6-octave Fractional Brownian Motion (FBM) procedural clouds with an interactive 16-point cursor velocity swirl trail.
- **Interactive Storyboard Engine** — Scroll-driven pinned hero presentation flipping between simulated developer environments (`about.sh`, `projects.html`, `resume.pdf`) with live telemetry and typewriter effects.
- **Dynamic LeetCode Sync** — Dedicated backend integration fetching live problem-solving stats, acceptance metrics, and ranking with 6-hour caching.
- **Production Contact Backend** — Express.js REST API with Nodemailer (SMTP), IP rate limiting (5 msg / 15 min), honeypot anti-spam defense, and HTML auto-acknowledgments.
- **Accessible & Adaptive** — Graceful degradation with `prefers-reduced-motion` detection, fallback SVG graphics for low-power hardware, and fluid clamp-based typography.

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technologies |
| :--- | :--- |
| **Frontend Core** | `React 19` `Vite` `Vanilla CSS Design Tokens` `HTML5` |
| **Graphics & 3D** | `Three.js` `@react-three/fiber` `GLSL Shaders` `Canvas 2D` |
| **Typography** | `Tasa Orbiter` `Inter Tight` `Roboto Mono` |
| **Backend & APIs**| `Node.js` `Express 5` `Nodemailer` `CORS` `RESTful APIs` |
| **Cloud & DevOps**| `Docker` `AWS (EC2, S3, CloudFront, IAM)` `Git/GitHub` |
| **Database** | `MongoDB (Mongoose)` `MySQL` `PostgreSQL` |

</div>

### Languages & Frameworks
<p align="left">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JS" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/C++-00599C?style=flat-square&logo=cplusplus&logoColor=white" alt="C++" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazonwebservices&logoColor=white" alt="AWS" />
</p>

---

## 🚀 Featured Projects Highlighted in Portfolio

### 1. [AI Personal Finance Advisor](https://github.com/Priyanshu2068)
> Multi-agent architecture orchestrated with LangChain and Gemini Flash API extracting natural-language financial statements to compute savings, investments, and real-time market trends via `yFinance`.
- **Tech:** Python, LangChain, Google Gemini Flash API, yFinance

### 2. [Webhook Manager](https://github.com/Priyanshu2068/Webhook-Manager)
> Centralized webhook distribution platform to register endpoints, ingest high-throughput events, verify delivery signatures, and replay failed attempts with JWT authentication.
- **Tech:** Node.js, Express.js, MongoDB, React, JWT

### 3. [Prepare.ai](https://prepare-ai-gt2d.vercel.app) • [GitHub](https://github.com/Priyanshu2068/Prepare-Ai)
> Full-stack interview-prep platform with subject-wise practice, AI-generated quizzes via Gemini with fallback question banks, attempt history, and strength/weakness analytics.
- **Tech:** Next.js, React, Express, MongoDB, Gemini API, Tailwind CSS, Recharts

### 4. [Voyager](https://voyager-five-ruby.vercel.app) • [GitHub](https://github.com/Priyanshu2068/Voyager)
> Full-scale MERN travel and reservation portal handling booking flows across flights, hotels, trains, and vehicles, backed by Socket.io real-time chat, Leaflet maps, and PDF ticketing.
- **Tech:** MongoDB, Express, React, Node.js, Socket.io, Material UI, Leaflet

### 5. [FitPulse](https://fit-pulse-fitness-tracker.vercel.app) • [GitHub](https://github.com/Priyanshu2068/FitPulse_Fitness_Tracker)
> Fitness and habit tracking application with Redux Toolkit state persistence, Recharts trend visualization, light/dark modes, and automated PDF health summaries.
- **Tech:** React, Redux Toolkit, Recharts, Tailwind CSS, Vite

---

## 📂 Project Architecture

```
portfolio/
├── public/                 # Static assets (Favicons, Resume PDF)
├── server/                 # Express backend API
│   ├── index.js            # Server entry: CORS, rate-limits & contact routes
│   └── leetcode.js         # LeetCode GraphQL fetcher with error handling
├── src/
│   ├── components/         # Modular UI & canvas components
│   │   ├── three/          # 3D WebGL modules
│   │   │   └── TwistedRing.jsx # Parametric Möbius wireframe & GLSL shader
│   │   ├── About.jsx       # Biography, statement & skills matrix
│   │   ├── Hero.jsx        # Storyboard engine & sticky scroll controller
│   │   ├── LeetCode.jsx    # Live LeetCode metric cards & problem meters
│   │   ├── Loader.jsx      # Warp-tunnel 2D canvas bootloader
│   │   ├── Sky.jsx         # Procedural FBM WebGL sky backdrop
│   │   └── ...             # Projects, Experience, Certifications, Contact
│   ├── lib/                # Motion helpers, event bus & custom timeline
│   ├── styles/             # Modular vanilla stylesheets (dark/light tokens)
│   ├── data.js             # Single source of truth for all portfolio content
│   └── main.jsx            # Application root
├── vite.config.js          # Vite config & API reverse proxy
└── package.json
```

---

## ⚡ Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Priyanshu2068/portfolio.git
cd portfolio
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Fill in your SMTP and server configuration:
```env
PORT=5000
LEETCODE_USER=priyanshu2068

# SMTP configuration for contact form
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM="Portfolio Contact <your_email@gmail.com>"
MAIL_TO=your_email@gmail.com
```

### 4. Run development server
```bash
# Starts both Vite client (port 5173) and Express API (port 5000) concurrently:
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Production Build & Deployment

```bash
# Build the production bundle with Vite
npm run build

# Start the full-stack server (serves dist/ and handles /api)
npm start
```

- **Frontend Only (Vercel / Netlify / GitHub Pages):** Run `npm run build` — output directory is `dist/`.
- **Full-Stack (Render / Railway / AWS EC2 / VPS):** Run `npm start` — Express serves the pre-built `dist/` directory alongside the `/api` contact and LeetCode endpoints.

---

## 🎨 Customizing Content

All portfolio content is decoupled from components and consolidated inside **`src/data.js`**:
- **Profile & Social Links**: Update the `profile` object.
- **Projects**: Modify the `projects` array with links, descriptions, and tech stacks.
- **Work & Education**: Update `education` and `certifications`.
- **Resume**: Replace `public/resume.pdf` with your updated resume.

---

## 📬 Contact & Connect

- **Portfolio:** [priyanshu2068.github.io](https://github.com/Priyanshu2068/portfolio)
- **Email:** [prish.3d@gmail.com](mailto:prish.3d@gmail.com)
- **LinkedIn:** [/in/priyanshu2068](https://www.linkedin.com/in/priyanshu2068/)
- **GitHub:** [@Priyanshu2068](https://github.com/Priyanshu2068)
- **LeetCode:** [@priyanshu2068](https://leetcode.com/u/priyanshu2068/)

---

<div align="center">
  <sub>Designed & Developed by <b>Priyanshu Tripathi</b> · Powered by React & Three.js</sub>
</div>
