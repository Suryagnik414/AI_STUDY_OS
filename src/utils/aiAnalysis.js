/**
 * aiAnalysis.js
 * ─────────────────────────────────────────────────────────────
 * Part 7: Self-Learning System + Smart Alerts + Weekly Insights
 *
 * Exports:
 *   analyzePerformance(logs, subjects)  → per-subject stats
 *   generateAlerts(logs, subjects)      → smart alert objects
 *   getWeeklyInsights(logs)             → last-7-log summary
 * ─────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────
// PART 7A · analyzePerformance
// ─────────────────────────────────────────────────────────────

/**
 * For every subject that appears in at least one log, compute:
 *   hardCount        – sessions where difficulty = 'Hard'
 *   missedCount      – sessions with a non-empty missedTasks field
 *   completedCount   – sessions where completedTasks is non-empty
 *   totalSessions    – all log entries for this subject
 *   failureRate      – hardCount / totalSessions  (0–1)
 *   consistencyScore – completedCount / totalSessions (0–1)
 *   strength         – 'Weak' | 'Medium' | 'Strong'
 *   avgFocus         – average focus level across sessions
 *
 * Subjects that have NO logs get strength = 'Unknown'.
 *
 * @param {Array} logs     – all daily log objects
 * @param {Array} subjects – all subject objects
 * @returns {Object}  { [subjectName]: stats }
 */
export function analyzePerformance(logs = [], subjects = []) {
  const result = {};

  // ── Seed every subject (even without logs) ───────────────
  subjects.forEach((s) => {
    result[s.name] = {
      hardCount:        0,
      missedCount:      0,
      completedCount:   0,
      totalSessions:    0,
      focusSum:         0,
      failureRate:      0,
      consistencyScore: 0,
      avgFocus:         0,
      strength:         'Unknown',   // upgraded once we have data
      type:             s.type,
    };
  });

  // ── Aggregate per-subject metrics from logs ──────────────
  logs.forEach((log) => {
    const name = log.subjectName;
    if (!name || !result[name]) return;

    const entry = result[name];
    entry.totalSessions += 1;

    if (log.difficulty === 'Hard') entry.hardCount += 1;

    const missed = (log.missedTasks || '').trim();
    if (missed && missed.toLowerCase() !== 'none') entry.missedCount += 1;

    const completed = (log.completedTasks || '').trim();
    if (completed) entry.completedCount += 1;

    entry.focusSum += Number(log.focusLevel || 0);
  });

  // ── Derive rates + strength level ────────────────────────
  Object.keys(result).forEach((name) => {
    const e = result[name];
    if (e.totalSessions === 0) return; // stays 'Unknown'

    e.failureRate      = e.hardCount    / e.totalSessions;
    e.consistencyScore = e.completedCount / e.totalSessions;
    e.avgFocus         = e.focusSum / e.totalSessions;

    /*
     * Strength classification:
     *   Weak   → failureRate >= 0.5  OR  consistencyScore < 0.4
     *   Strong → failureRate <  0.2  AND consistencyScore >= 0.7
     *   Medium → everything else
     */
    if (e.failureRate >= 0.5 || e.consistencyScore < 0.4) {
      e.strength = 'Weak';
    } else if (e.failureRate < 0.2 && e.consistencyScore >= 0.7) {
      e.strength = 'Strong';
    } else {
      e.strength = 'Medium';
    }
  });

  return result;
}

// ─────────────────────────────────────────────────────────────
// PART 7B · generateAlerts
// ─────────────────────────────────────────────────────────────

/**
 * Produces an array of alert objects:
 *   { id, type, icon, title, message }
 *
 * Alert types: 'danger' | 'warning' | 'info' | 'success'
 *
 * Rules checked:
 *   1. Total missed tasks ≥ 2           → "Falling behind"
 *   2. Focus < 3 on last 3 sessions     → "Low focus detected"
 *   3. Any subject Hard ≥ 2 consecutive → "Weak subject detected"
 *   4. No sessions logged in 2+ days    → "Study gap detected"
 *   5. Avg focus ≥ 4 in last 5 logs     → "Great momentum!" (positive)
 *   6. Study streak of 5+ consecutive days → "Study streak!" (positive)
 */
export function generateAlerts(logs = [], subjects = []) {
  const alerts = [];
  if (logs.length === 0) return alerts;

  // ── Rule 1: total missed tasks ────────────────────────────
  const totalMissed = logs.reduce((sum, l) => {
    const m = (l.missedTasks || '').trim();
    if (!m || m.toLowerCase() === 'none') return sum;
    return sum + m.split(/[,\n]+/).filter((t) => t.trim()).length;
  }, 0);

  if (totalMissed >= 2) {
    alerts.push({
      id:      'falling-behind',
      type:    'danger',
      icon:    '🚨',
      title:   'You are falling behind!',
      message: `${totalMissed} task${totalMissed !== 1 ? 's' : ''} have been missed across your logs. Reschedule them as high priority.`,
    });
  }

  // ── Rule 2: low focus in recent sessions ──────────────────
  const recentLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
  const lowFocusDays = recentLogs.filter((l) => Number(l.focusLevel) < 3).length;

  if (lowFocusDays >= 2) {
    alerts.push({
      id:      'low-focus',
      type:    'warning',
      icon:    '😴',
      title:   'Low focus detected',
      message: `Your focus was below 3/5 in ${lowFocusDays} of your last 3 sessions. Review your study environment, sleep routine, or break schedule.`,
    });
  }

  // ── Rule 3: same subject Hard ≥ 2 times → weak subject ───
  const hardCounts = {};
  logs.forEach((l) => {
    if (l.difficulty === 'Hard' && l.subjectName) {
      hardCounts[l.subjectName] = (hardCounts[l.subjectName] || 0) + 1;
    }
  });

  Object.entries(hardCounts).forEach(([name, count]) => {
    if (count >= 2) {
      alerts.push({
        id:      `weak-${name}`,
        type:    'danger',
        icon:    '📌',
        title:   `Weak subject detected: ${name}`,
        message: `Marked as Hard ${count} time${count !== 1 ? 's' : ''}. Schedule dedicated deep-work sessions and focus on fundamentals.`,
      });
    }
  });

  // ── Rule 4: study gap (no session in last 2 days) ─────────
  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const lastSession = sorted[0];
  const hoursSinceLastSession =
    (Date.now() - lastSession.timestamp) / 3_600_000;

  if (hoursSinceLastSession > 48) {
    const days = Math.floor(hoursSinceLastSession / 24);
    alerts.push({
      id:      'study-gap',
      type:    'warning',
      icon:    '⏰',
      title:   'Study gap detected',
      message: `No session logged in the last ${days} day${days !== 1 ? 's' : ''}. Consistency is key for GATE prep — get back on track today!`,
    });
  }

  // ── Rule 5: great focus momentum (positive alert) ─────────
  const last5 = sorted.slice(0, 5);
  if (last5.length >= 3) {
    const avgFocus5 =
      last5.reduce((s, l) => s + Number(l.focusLevel || 0), 0) / last5.length;
    if (avgFocus5 >= 4) {
      alerts.push({
        id:      'great-focus',
        type:    'success',
        icon:    '🔥',
        title:   'Great momentum!',
        message: `Your average focus over the last ${last5.length} sessions is ${avgFocus5.toFixed(1)}/5. Keep it up!`,
      });
    }
  }

  // ── Rule 6: study streak ──────────────────────────────────
  const streak = computeStreak(logs);
  if (streak >= 5) {
    alerts.push({
      id:      'streak',
      type:    'success',
      icon:    '🏆',
      title:   `${streak}-day study streak!`,
      message: 'You have logged at least one session every day for the past ' +
               `${streak} days. Outstanding consistency!`,
    });
  }

  return alerts;
}

/** Count consecutive days (from today backwards) that have at least 1 log. */
function computeStreak(logs) {
  if (logs.length === 0) return 0;

  // Build a Set of date strings "YYYY-MM-DD"
  const dateset = new Set(
    logs.map((l) => new Date(l.timestamp).toISOString().slice(0, 10))
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dateset.has(key)) {
      streak++;
    } else {
      break; // streak broken
    }
  }

  return streak;
}

// ─────────────────────────────────────────────────────────────
// PART 7C · getWeeklyInsights
// ─────────────────────────────────────────────────────────────

/**
 * Analyse the last 7 log entries (sorted newest-first) and return:
 *   totalHours        – sum of hoursStudied
 *   avgFocus          – mean focus level
 *   mostWeakSubject   – subject with highest hard count
 *   hardSessionCount  – sessions rated Hard
 *   missedTaskCount   – total missed tasks
 *   streak            – consecutive study days
 *   trend             – 'Improving' | 'Declining' | 'Stable' | 'Not enough data'
 *   weekLogs          – the 7 (or fewer) logs used
 */
export function getWeeklyInsights(logs = []) {
  const sorted    = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const weekLogs  = sorted.slice(0, 7);

  if (weekLogs.length === 0) {
    return {
      totalHours: 0, avgFocus: 0, mostWeakSubject: null,
      hardSessionCount: 0, missedTaskCount: 0, trend: 'Not enough data',
      streak: 0, weekLogs: [],
    };
  }

  const totalHours = weekLogs.reduce((s, l) => s + Number(l.hoursStudied || 0), 0);
  const avgFocus   = weekLogs.reduce((s, l) => s + Number(l.focusLevel  || 0), 0) / weekLogs.length;

  // Most weak subject in the window
  const hardMap = {};
  weekLogs.forEach((l) => {
    if (l.difficulty === 'Hard' && l.subjectName) {
      hardMap[l.subjectName] = (hardMap[l.subjectName] || 0) + 1;
    }
  });
  const mostWeakSubject =
    Object.keys(hardMap).length > 0
      ? Object.entries(hardMap).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  const hardSessionCount = weekLogs.filter((l) => l.difficulty === 'Hard').length;

  const missedTaskCount = weekLogs.reduce((sum, l) => {
    const m = (l.missedTasks || '').trim();
    if (!m || m.toLowerCase() === 'none') return sum;
    return sum + m.split(/[,\n]+/).filter((t) => t.trim()).length;
  }, 0);

  // Trend: compare focus of first half vs second half of weekLogs
  // (weekLogs is newest-first, so "recent" = [0], "older" = [-1])
  let trend = 'Stable';
  if (weekLogs.length >= 4) {
    const half = Math.floor(weekLogs.length / 2);
    const recentFocus = weekLogs.slice(0, half).reduce((s, l) => s + Number(l.focusLevel || 0), 0) / half;
    const olderFocus  = weekLogs.slice(half).reduce((s, l) => s + Number(l.focusLevel || 0), 0) / (weekLogs.length - half);
    if      (recentFocus - olderFocus >= 0.5) trend = 'Improving';
    else if (olderFocus  - recentFocus >= 0.5) trend = 'Declining';
    else                                        trend = 'Stable';
  } else {
    trend = 'Not enough data';
  }

  const streak = computeStreak(logs);

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    avgFocus:   Math.round(avgFocus   * 10) / 10,
    mostWeakSubject,
    hardSessionCount,
    missedTaskCount,
    trend,
    streak,
    weekLogs,
  };
}
