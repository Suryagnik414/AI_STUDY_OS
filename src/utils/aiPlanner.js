/**
 * aiPlanner.js
 * ─────────────────────────────────────────────────────────────
 * Part 6 + Part 7 upgrade: AI Smart Planner
 *
 * generateSmartPlan(subjects, logs)
 *   - Scores every subject based on difficulty history, missed tasks,
 *     days until exam, AND the strength level from analyzePerformance.
 *   - Weak subjects get an extra +15 boost.
 *   - Strong subjects are reduced by −5 (still scheduled, just less often).
 *   - Picks the highest-priority GATE subject, College subject, and a
 *     Revision subject from whatever remains.
 * ─────────────────────────────────────────────────────────────
 */
import { analyzePerformance } from './aiAnalysis';

/**
 * Build a priority score map  { subjectName → { score, reasons } }
 * Higher score = higher priority.
 *
 * Scoring rules:
 *   +10   each log where difficulty === 'Hard'   (weak subject)
 *   +6    each log with non-empty missedTasks    (pending work)
 *   +4    if the subject appears in any log      (active)
 *   +15   strength === 'Weak'   (from analyzePerformance)
 *   −5    strength === 'Strong' (already mastered)
 *   +0–5  urgency bonus: closer exam date → higher bonus
 */
function buildPriorityMap(subjects, logs) {
  const map = {};

  // Initialise every subject with a base score of 1
  subjects.forEach((s) => {
    map[s.name] = { score: 1, reasons: [] };
  });

  // Score from logs
  logs.forEach((log) => {
    const name = log.subjectName;
    if (!name || !map[name]) return;

    // Hard difficulty → weak area
    if (log.difficulty === 'Hard') {
      map[name].score += 10;
      if (!map[name].reasons.includes('Marked as weak (Hard)')) {
        map[name].reasons.push('Marked as weak (Hard)');
      }
    }

    // Missed tasks → pending work
    const missed = (log.missedTasks || '').trim();
    if (missed && missed.toLowerCase() !== 'none') {
      map[name].score += 6;
      if (!map[name].reasons.includes('Has missed tasks')) {
        map[name].reasons.push('Has missed tasks');
      }
    }

    // Appeared in at least one log → active subject
    if (!map[name].reasons.some((r) => r.startsWith('Active'))) {
      map[name].score += 4;
      map[name].reasons.push('Active subject');
    }
  });

  // ── Part 7 upgrade: strength-level adjustment ─────────────
  const perf = analyzePerformance(logs, subjects);
  subjects.forEach((s) => {
    const strength = perf[s.name]?.strength;
    if (strength === 'Weak') {
      map[s.name].score += 15;
      if (!map[s.name].reasons.includes('AI: Weak subject')) {
        map[s.name].reasons.push('AI: Weak subject');
      }
    } else if (strength === 'Strong') {
      map[s.name].score = Math.max(1, map[s.name].score - 5);
      if (!map[s.name].reasons.includes('AI: Strong – lower frequency')) {
        map[s.name].reasons.push('AI: Strong – lower frequency');
      }
    }
  });

  // Urgency bonus based on exam date (0–5 pts)
  subjects.forEach((s) => {
    if (!s.examDate) return;
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(s.examDate) - new Date()) / 86_400_000)
    );
    if (daysLeft <= 30) {
      map[s.name].score += 5;
      map[s.name].reasons.push('Exam < 30 days');
    } else if (daysLeft <= 60) {
      map[s.name].score += 3;
      map[s.name].reasons.push('Exam < 60 days');
    } else if (daysLeft <= 90) {
      map[s.name].score += 1;
    }
  });

  return map;
}

/**
 * Pick the highest-priority subject from a filtered list.
 * Ties are broken randomly so you don't always get the same subject.
 */
function pickBest(subjectList, priorityMap) {
  if (subjectList.length === 0) return null;

  const sorted = [...subjectList].sort((a, b) => {
    const diff =
      (priorityMap[b.name]?.score ?? 1) - (priorityMap[a.name]?.score ?? 1);
    // Random tie-break
    return diff !== 0 ? diff : Math.random() - 0.5;
  });

  return sorted[0];
}

/**
 * Main export — generates a 3-item study plan.
 *
 * Returns an array of plan items:
 *   { subject, type, tag, time, reasons }
 *
 * Returns null if there are no subjects at all.
 */
export function generateSmartPlan(subjects, logs = []) {
  if (!subjects || subjects.length === 0) return null;

  const priorityMap = buildPriorityMap(subjects, logs);

  const gateSubjects    = subjects.filter((s) => s.type === 'GATE');
  const collegeSubjects = subjects.filter((s) => s.type === 'College');

  const plan = [];
  const usedNames = new Set();

  // ── Slot 1: Best GATE subject (2h main study) ────────────
  const gateTop = pickBest(gateSubjects, priorityMap);
  if (gateTop) {
    plan.push({
      subject: gateTop.name,
      type: 'GATE',
      tag: 'Main Study',
      time: '2h',
      reasons: priorityMap[gateTop.name]?.reasons ?? [],
    });
    usedNames.add(gateTop.name);
  }

  // ── Slot 2: Best College subject (1.5h main study) ───────
  const collegeTop = pickBest(collegeSubjects, priorityMap);
  if (collegeTop) {
    plan.push({
      subject: collegeTop.name,
      type: 'College',
      tag: 'Main Study',
      time: '1.5h',
      reasons: priorityMap[collegeTop.name]?.reasons ?? [],
    });
    usedNames.add(collegeTop.name);
  }

  // ── Slot 3: Revision – highest priority unused subject ───
  const remaining = subjects.filter((s) => !usedNames.has(s.name));
  const revTop = pickBest(remaining, priorityMap);

  if (revTop) {
    plan.push({
      subject: revTop.name,
      type: revTop.type,
      tag: 'Revision',
      time: '1h',
      reasons: priorityMap[revTop.name]?.reasons ?? [],
    });
  } else if (plan.length > 0) {
    // All subjects already used → revise the top-priority one
    const fallback = plan[0];
    plan.push({
      subject: fallback.subject,
      type: fallback.type,
      tag: 'Revision',
      time: '45m',
      reasons: ['All subjects covered – revisiting top priority'],
    });
  }

  return plan;
}

/**
 * Convenience helper: returns a sorted list of all subjects
 * with their computed priority score and reasons.
 * Useful for showing the "AI reasoning" panel in the UI.
 */
export function getSubjectPriorities(subjects, logs = []) {
  if (!subjects || subjects.length === 0) return [];
  const map = buildPriorityMap(subjects, logs);
  return [...subjects]
    .map((s) => ({
      ...s,
      score:   map[s.name]?.score   ?? 1,
      reasons: map[s.name]?.reasons ?? [],
    }))
    .sort((a, b) => b.score - a.score);
}
