/**
 * server.js — AI Study OS Secure Backend
 * ═══════════════════════════════════════════════════════════════
 * All OpenAI calls happen HERE. The frontend never sees the API key.
 *
 * Endpoints:
 *   POST /api/generate-plan    → GATE mentor study plan
 *   POST /api/ai-command       → Feature proposal from natural language
 *   POST /api/analyze-error    → Runtime error diagnosis
 *   GET  /api/health           → Server health check
 * ═══════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const Groq = require('groq-sdk');

// ── Validate required env ────────────────────────────────────
if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('your_key')) {
  console.error('❌  GROQ_API_KEY is missing in server/.env');
  process.exit(1);
}

// ── Init ─────────────────────────────────────────────────────
const app    = express();
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL  = process.env.GROQ_MODEL || 'llama3-70b-8192';
const PORT   = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    /\.vercel\.app$/,       // allow deployed Vercel frontend
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); // Ensure preflight completes successfully
app.use(express.json({ limit: '256kb' }));

// ── Request logger (dev only) ─────────────────────────────────
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ─────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────

/** Format subject list for the prompt */
function formatSubjects(subjects = []) {
  return subjects.map((s) => {
    const daysLeft = s.examDate
      ? Math.max(0, Math.ceil((new Date(s.examDate) - new Date()) / 86_400_000))
      : null;
    return `• ${s.name} [${s.type}]${daysLeft !== null ? ` — exam in ${daysLeft} day(s)` : ''}`;
  }).join('\n') || '(No subjects added yet)';
}

/** Format recent logs for the prompt (newest 10) */
function formatLogs(logs = []) {
  const recent = [...logs]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  if (recent.length === 0) return '(No logs yet)';

  return recent.map((l) => {
    const date   = new Date(l.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const missed = (l.missedTasks || '').trim();
    return [
      `[${date}]`,
      l.subjectName ? `Subject: ${l.subjectName}` : '',
      `Difficulty: ${l.difficulty}`,
      `Focus: ${l.focusLevel}/5`,
      `Hours: ${l.hoursStudied}h`,
      missed && missed.toLowerCase() !== 'none' ? `Missed: ${missed}` : '',
    ].filter(Boolean).join(' | ');
  }).join('\n');
}

/** Build weak-subject summary */
function getWeakSubjects(logs = []) {
  const counts = {};
  logs.forEach((l) => {
    if (l.difficulty === 'Hard' && l.subjectName) {
      counts[l.subjectName] = (counts[l.subjectName] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, n]) => `${name} (Hard ×${n})`)
    .join(', ') || 'None identified yet';
}

/** Parse AI array response robustly */
function parseArrayResponse(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Could not extract JSON array from AI response');
    parsed = JSON.parse(match[0]);
  }
  if (!Array.isArray(parsed)) {
    const key = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    if (!key) throw new Error('No array found in AI response');
    parsed = parsed[key];
  }
  return parsed;
}

/** Parse AI object response robustly */
function parseObjectResponse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not extract JSON object from AI response');
    return JSON.parse(match[0]);
  }
}

// ─────────────────────────────────────────────────────────────
// PART 2: POST /api/generate-plan
// ─────────────────────────────────────────────────────────────
app.post('/api/generate-plan', async (req, res) => {
  try {
    const { subjects = [], logs = [], analysis = {} } = req.body;

    if (!subjects.length) {
      return res.status(400).json({ error: 'At least one subject is required.' });
    }

    const today = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 1400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert GATE exam mentor and personalised study planner for
Indian engineering students. You deeply understand GATE syllabus, exam patterns,
and the balance required between GATE prep and college coursework.

Your task is to create a focused, realistic DAILY STUDY PLAN.

Rules:
1. Prioritise GATE subjects — at least one must be the main focus.
2. Include one college subject if available.
3. Include one revision block — always prefer weak/hard subjects for revision.
4. Keep total planned hours between 4–8h.
5. Weak subjects (rated Hard repeatedly) → more revision time, less new content.
6. Exam within 30 days → mark tag as "Urgent" and increase allocation.
7. If a subject has missed tasks → include a "Catch-up" session.

Output format: valid JSON object with a "plan" key containing an array.
Each plan item MUST have:
{
  "subject": "exact subject name",
  "type": "GATE" or "College",
  "tag": "Main Study" | "Revision" | "Practice" | "Urgent" | "Catch-up",
  "time": "e.g. 2h or 1.5h or 45m",
  "reason": "one sentence why this subject is prioritised today",
  "aiNote": "one sentence of personalised study advice for this session"
}`,
        },
        {
          role: 'user',
          content: `Today is ${today}.

=== SUBJECTS ===
${formatSubjects(subjects)}

=== WEAK SUBJECTS (from logs) ===
${getWeakSubjects(logs)}

=== RECENT LOGS (newest first) ===
${formatLogs(logs)}

=== PERFORMANCE ANALYSIS ===
${JSON.stringify(analysis, null, 2) || 'Not available yet'}

Create today's optimal study plan. Reference my actual subject names.
Acknowledge weak areas. Output JSON only.`,
        },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const data = parseObjectResponse(raw);
    const plan = Array.isArray(data.plan) ? data.plan : parseArrayResponse(raw);

    // Normalise plan items
    const normalised = plan
      .filter((item) => item && typeof item.subject === 'string')
      .map((item) => ({
        subject: item.subject,
        type:    item.type    || 'GATE',
        tag:     item.tag     || 'Main Study',
        time:    item.time    || '1h',
        reason:  item.reason  || '',
        aiNote:  item.aiNote  || '',
        source:  'openai',
      }))
      .slice(0, 6);

    if (!normalised.length) {
      return res.status(500).json({ error: 'AI returned an empty plan.' });
    }

    res.json({ plan: normalised, model: MODEL, timestamp: Date.now() });

  } catch (err) {
    console.error('[/api/generate-plan]', err.message);
    res.status(500).json({ error: err.message || 'Plan generation failed.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PART 3: POST /api/ai-command
// ─────────────────────────────────────────────────────────────
app.post('/api/ai-command', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command || !command.trim()) {
      return res.status(400).json({ error: 'Command is required.' });
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert software architect for a React study-management app
called "AI Study OS". It has these pages: Dashboard, Planner, Daily Log,
Mock Predictor, AI Command Center.

When given a feature request, output a JSON object with exactly these fields:
{
  "featureName": "short feature name",
  "icon": "single relevant emoji",
  "description": "2–3 sentence description of what this feature does",
  "category": "Analytics|Productivity|AI Logic|UI/UX|Gamification|Learning|Custom",
  "steps": ["ordered", "implementation", "steps"],
  "affectedFiles": ["src/...", "..."],
  "estimatedComplexity": "Low|Medium|High",
  "priority": "Low|Medium|High"
}`,
        },
        {
          role: 'user',
          content: `Feature request: "${command.trim()}"`,
        },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const result = parseObjectResponse(raw);

    res.json({
      ...result,
      originalCommand: command.trim(),
      id:        `feat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      source:    'openai',
    });

  } catch (err) {
    console.error('[/api/ai-command]', err.message);
    res.status(500).json({ error: err.message || 'Command processing failed.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PART 4: POST /api/analyze-error
// ─────────────────────────────────────────────────────────────
app.post('/api/analyze-error', async (req, res) => {
  try {
    const { errorMessage } = req.body;
    if (!errorMessage || !errorMessage.trim()) {
      return res.status(400).json({ error: 'errorMessage is required.' });
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert React and JavaScript debugger.
Analyse the error message and return a JSON object with:
{
  "issue": "concise issue title (10 words max)",
  "rootCause": "one sentence root cause explanation",
  "fixSuggestion": "concrete, actionable fix in 1–3 sentences",
  "codeExample": "optional short code snippet showing the fix (or empty string)",
  "severity": "Low|Medium|High"
}`,
        },
        {
          role: 'user',
          content: `Error: ${errorMessage.trim()}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const result = parseObjectResponse(raw);

    res.json({
      ...result,
      originalError: errorMessage.trim(),
      timestamp: Date.now(),
      source: 'openai',
    });

  } catch (err) {
    console.error('[/api/analyze-error]', err.message);
    res.status(500).json({ error: err.message || 'Error analysis failed.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/health
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    model:  MODEL,
    time:   new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 AI Study OS Backend running securely on http://localhost:${PORT}`);
  console.log(`   Model  : ${MODEL}`);
  console.log(`   Health : http://localhost:${PORT}/api/health\n`);
});
