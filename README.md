# 🤖 AI Study OS

> **A self-evolving, AI-powered study management platform for GATE aspirants.**  
> Plan smarter. Study harder. Let AI do the heavy lifting.

![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Groq](https://img.shields.io/badge/AI-Groq%20LLaMA%203-FF6B35?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## 📖 What is AI Study OS?

AI Study OS is a full-stack, AI-driven study management platform designed specifically for Indian engineering students preparing for **GATE** (Graduate Aptitude Test in Engineering) while juggling college coursework.

It's not just a tracker — it's a **self-evolving study ecosystem** that uses real AI to plan your day, analyse your performance, identify weak areas, and even propose new features through a natural language command center.

---

## ✨ Features

### 🗓️ AI-Powered Smart Planner
- Generates a **personalized daily study plan** using Groq's LLaMA 3.3 70B model
- Acts as a **GATE mentor** — balances high-yield topics with college deadlines
- **Context-aware**: analyses recent logs, focus levels, missed tasks & weak subjects
- Smart offline fallback using a rule-based priority engine

### 🤖 AI Command Center
- Type natural language commands like *"Add a weekly mock test tracker"*
- AI generates a full **implementation plan** with steps, affected files & complexity estimate
- Safe review-before-apply workflow — nothing runs without your approval
- Persistent feature history across sessions

### 🧠 Self-Learning Performance Engine
- Automatically classifies subjects as **Weak / Medium / Strong**
- Tracks consistency scores, focus levels & failure rates from daily logs
- Sends real-time alerts when you're falling behind or need revision

### 📋 Daily Study Logger
- Log sessions with subject, difficulty, focus level (1–5), hours & missed tasks
- Data powers the AI planner for increasingly personalized plans

### 📊 Mock Test Predictor
- Predicts GATE score range based on your performance data
- Tracks subject-wise mock scores over time

### 🚨 Runtime Error Monitor
- Globally catches frontend crashes and runtime errors
- Sends error traces to the AI backend for **instant diagnosis & fix suggestions**

### 🏠 Smart Dashboard
- Glassmorphic dark-theme UI with smooth animations
- Visualises study hours, subject health, and active AI features
- Browser desktop notifications for reminders and plan readiness

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Context API |
| **Backend** | Node.js, Express.js (Secure Proxy) |
| **AI Model** | Groq API — `llama-3.3-70b-versatile` |
| **Styling** | Vanilla CSS with CSS Variables (custom design system) |
| **Storage** | LocalStorage (offline-first persistence) |
| **Security** | Server-side API key proxy, CORS protection |

---
<img width="1867" height="901" alt="Screenshot 2026-04-17 204319" src="https://github.com/user-attachments/assets/44bbda96-fba4-4e6a-a5b3-01216fc5c425" />
---
<img width="1907" height="907" alt="Screenshot 2026-04-17 204345" src="https://github.com/user-attachments/assets/a3a0495b-caea-41e9-a844-d4e7b2db1ed5" />
---
<img width="1907" height="883" alt="Screenshot 2026-04-17 204400" src="https://github.com/user-attachments/assets/31781823-8f07-4261-837f-c26ace201568" />
---
<img width="1889" height="886" alt="Screenshot 2026-04-17 204416" src="https://github.com/user-attachments/assets/992ece79-d613-4bcf-acdd-41d8000e71d9" />
---
<img width="1893" height="889" alt="Screenshot 2026-04-17 204428" src="https://github.com/user-attachments/assets/023852db-c865-42cf-830f-8e1c7b824746" />
---
<img width="1874" height="893" alt="Screenshot 2026-04-17 204443" src="https://github.com/user-attachments/assets/4ff1b264-d8cb-403f-b2c9-81d6d559e5c2" />
---
<img width="1870" height="893" alt="Screenshot 2026-04-17 204455" src="https://github.com/user-attachments/assets/ba89ab69-4888-4259-9b65-1c27c6e68ee5" />
---



## 🏗️ Architecture

```
┌─────────────────────────────────┐
│         React Frontend          │  ← Vercel (free)
│   Dashboard / Planner / Logs    │
│   AI Command / Mock Predictor   │
└──────────────┬──────────────────┘
               │ HTTP (REST API)
               ▼
┌─────────────────────────────────┐
│      Express.js Backend         │  ← Render (free)
│   /api/generate-plan            │
│   /api/ai-command               │
│   /api/analyze-error            │
│   /api/health                   │
└──────────────┬──────────────────┘
               │
               ▼
        ┌─────────────┐
        │  Groq API   │  ← LLaMA 3.3 70B
        └─────────────┘
```

> **Security:** The Groq API key **never touches the browser**. It lives only on the backend server, injected via environment variables.

---

## 📥 Local Development Setup

### Prerequisites
- Node.js v16+
- A free [Groq API Key](https://console.groq.com) (takes 30 seconds to get)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/AI-Study-OS.git
cd AI-Study-OS
```

### 2. Set up the Backend
```bash
cd server
npm install
```

Create `server/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=5000
```

Start the backend:
```bash
npm start
# → Backend running on http://localhost:5000
```

### 3. Set up the Frontend
```bash
# In the root directory (not /server)
cd ..
npm install
```

Create `.env` in root:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_NAME="AI Study OS"
```

Start the frontend:
```bash
npm start
# → App running on http://localhost:3000
```

---

## 🚀 Free Deployment Guide

### Backend → [Render](https://render.com) (Free Tier)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** → `server`
4. Set **Build Command** → `npm install`
5. Set **Start Command** → `node server.js`
6. Under **Environment Variables**, add:
   ```
   GROQ_API_KEY   = your_actual_groq_key
   GROQ_MODEL     = llama-3.3-70b-versatile
   NODE_ENV       = production
   ```
7. Deploy → you'll get a URL like `https://ai-study-os-backend.onrender.com`

> ⚠️ Free Render tier **sleeps after 15 min** of inactivity. First request wakes it in ~30s. Use [cron-job.org](https://cron-job.org) for a free keep-alive ping.

### Frontend → [Vercel](https://vercel.com) (Free Tier)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** → `/` (project root)
4. Under **Environment Variables**, add:
   ```
   REACT_APP_API_URL = https://ai-study-os-backend.onrender.com
   ```
5. Deploy → you'll get a URL like `https://ai-study-os.vercel.app`

---

## 🔐 Security Model

| What | How |
|---|---|
| Groq API Key | Stored **only** in server environment variables, never in frontend code |
| CORS | Backend only accepts requests from `localhost` and `*.vercel.app` |
| Request Validation | All inputs are validated and sanitized before hitting the AI |
| `.env` files | Excluded from Git via `.gitignore` — never committed |

---

## 📁 Project Structure

```
AI-Study-OS/
├── public/                  # Static assets
├── src/
│   ├── components/          # Sidebar, ErrorBoundary, etc.
│   ├── context/             # React Context (global state)
│   ├── pages/
│   │   ├── Dashboard.js     # Main overview
│   │   ├── Planner.js       # AI study planner
│   │   ├── DailyLog.js      # Session logger
│   │   ├── MockPredictor.js # Score predictor
│   │   └── AICommand.js     # AI command center
│   ├── utils/               # AI service, notification utils
│   ├── App.js
│   └── index.css            # Full design system
├── server/
│   ├── server.js            # Express backend + all AI endpoints
│   ├── package.json
│   └── .env                 # ← NOT committed to git
├── .env                     # ← NOT committed to git
├── .env.example             # Safe template for contributors
└── .gitignore
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use, modify and distribute.

---

<div align="center">

**Designed for high-performance students. Powered by AI.**

⭐ Star this repo if it helped your GATE prep!

</div>
