/**
 * openaiService.js  (Frontend → Backend proxy)
 * ──────────────────────────────────────────────────────────────
 * The API key lives in server/.env  — this file has NO secrets.
 *
 * All functions call the Express backend instead of OpenAI directly.
 *
 * Exports (same interface as before so Planner.js needs no changes):
 *   generateAIPlan(subjects, logs)      → plan array  (async)
 *   generateAICommand(command)          → feature proposal  (async)
 *   analyzeError(errorMessage)          → fix suggestion  (async)
 *   isOpenAIConfigured()               → boolean (is backend reachable?)
 *   AI_MODEL                           → model label string
 *   estimateTokens()                   → rough token count (offline estimate)
 * ──────────────────────────────────────────────────────────────
 */

// Backend base URL — defaults to localhost:5000 in development.
// In production set  REACT_APP_API_URL=https://your-backend.onrender.com
const API_BASE =
  process.env.REACT_APP_API_URL?.replace(/\/$/, '') ||
  'http://localhost:5000';

export const AI_MODEL = 'llama-3.3-70b-versatile (via Groq backend)';

// ── Backend availability check ─────────────────────────────
let _backendStatus = null; // null=unknown, true=up, false=down

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
    _backendStatus = res.ok;
    return res.ok;
  } catch {
    _backendStatus = false;
    return false;
  }
}

export function isOpenAIConfigured() {
  // Returns true unless we've already confirmed the backend is down.
  return _backendStatus !== false;
}

// ── Generic POST helper ─────────────────────────────────────
async function post(endpoint, body) {
  let res;
  
  // FIX: Catch network-level failures ("Failed to fetch") cleanly
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
  } catch (netError) {
    console.error(`Network Error calling ${endpoint}:`, netError);
    throw new Error('Backend server is unreachable. Is the Node.js server running in the /server directory?');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Backend returned error ${res.status}`);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// PART 5: generateAIPlan — replaces direct OpenAI call
// ─────────────────────────────────────────────────────────────
/**
 * Calls POST /api/generate-plan  on the Express backend.
 * @returns {Promise<Array>} plan items: [{ subject, type, tag, time, reason, aiNote }]
 */
export async function generateAIPlan(subjects, logs = [], analysis = {}) {
  const data = await post('/api/generate-plan', { subjects, logs, analysis });
  return data.plan ?? [];
}

// ─────────────────────────────────────────────────────────────
// generateAICommand — replaces rule-based fallback
// ─────────────────────────────────────────────────────────────
/**
 * Calls POST /api/ai-command  for a real GPT-powered feature proposal.
 * Falls back to the local rule-based engine on error (see aiCommandEngine.js).
 */
export async function generateAICommand(command) {
  return post('/api/ai-command', { command });
}

// ─────────────────────────────────────────────────────────────
// analyzeError — replaces local pattern matching
// ─────────────────────────────────────────────────────────────
/**
 * Calls POST /api/analyze-error.
 * @returns {Promise<Object>} { issue, rootCause, fixSuggestion, codeExample, severity }
 */
export async function analyzeError(errorMessage) {
  return post('/api/analyze-error', { errorMessage });
}

// ── Offline token estimator (unchanged) ──────────────────────
export function estimateTokens(subjects = [], logs = []) {
  const base = 600; // system prompt approx
  const subTokens = subjects.length * 15;
  const logTokens = Math.min(logs.length, 10) * 30;
  return base + subTokens + logTokens;
}
