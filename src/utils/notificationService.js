/**
 * notificationService.js
 * ──────────────────────────────────────────────────────────────
 * Part 6: Browser Notification System
 *
 * Exports:
 *   requestPermission()                 → Promise<boolean>
 *   isNotificationsSupported()          → boolean
 *   notificationPermission()           → 'granted'|'denied'|'default'
 *   notify(title, body, options)        → Notification | null
 *   scheduleReminder(delayMs, title, body) → clearTimeout handle
 *
 *   triggerStudyGapAlert(hoursSince)
 *   triggerLowFocusAlert(avgFocus)
 *   triggerMissedTasksAlert(count)
 *   triggerStreakAlert(days)
 *   triggerPlanReadyAlert(planLength)
 * ──────────────────────────────────────────────────────────────
 */

/** Check if Notification API exists in this browser */
export function isNotificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Get current permission status */
export function notificationPermission() {
  if (!isNotificationsSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Ask the user for notification permission.
 * Returns true if granted.
 */
export async function requestPermission() {
  if (!isNotificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Show a browser notification immediately.
 * Silently fails if permission is not granted.
 */
export function notify(title, body, options = {}) {
  if (!isNotificationsSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const n = new Notification(title, {
      body,
      icon:   '/favicon.ico',
      badge:  '/favicon.ico',
      silent: false,
      tag:    options.tag || title,
      ...options,
    });

    // Auto-close after 8 seconds
    setTimeout(() => n.close(), options.duration || 8000);

    n.onclick = () => {
      window.focus();
      n.close();
      if (options.onClick) options.onClick();
    };

    return n;
  } catch (e) {
    console.warn('[notificationService] Failed to show notification:', e);
    return null;
  }
}

/**
 * Schedule a notification after a delay.
 * @returns clearTimeout handle — call clearTimeout(handle) to cancel.
 */
export function scheduleReminder(delayMs, title, body, options = {}) {
  return setTimeout(() => notify(title, body, options), delayMs);
}

// ── Pre-built trigger functions ──────────────────────────────

export function triggerStudyGapAlert(hoursSince = 0) {
  const days = Math.floor(hoursSince / 24);
  return notify(
    '⏰ Study Gap Detected',
    `You haven't logged a session in ${days > 0 ? `${days} day(s)` : 'a while'}. Stay consistent for GATE prep!`,
    { tag: 'study-gap' }
  );
}

export function triggerLowFocusAlert(avgFocus = 0) {
  return notify(
    '😴 Low Focus Detected',
    `Your average focus is ${avgFocus}/5 recently. Consider reviewing sleep, breaks, or study environment.`,
    { tag: 'low-focus' }
  );
}

export function triggerMissedTasksAlert(count = 0) {
  return notify(
    '🚨 Missed Tasks Alert',
    `You have ${count} missed task(s). Open AI Study OS and reschedule them as high priority.`,
    { tag: 'missed-tasks' }
  );
}

export function triggerStreakAlert(days = 0) {
  return notify(
    `🏆 ${days}-Day Study Streak!`,
    `Outstanding! You've logged a session every day for ${days} days. Keep it up!`,
    { tag: 'streak' }
  );
}

export function triggerPlanReadyAlert(planLength = 0) {
  return notify(
    '✅ Study Plan Ready',
    `Your AI-generated plan has ${planLength} session(s) ready. Open the app to start!`,
    { tag: 'plan-ready' }
  );
}

export function triggerWeakSubjectAlert(subjectName) {
  return notify(
    `📌 Weak Subject: ${subjectName}`,
    `${subjectName} has been marked Hard multiple times. Schedule a focused revision session today.`,
    { tag: `weak-${subjectName}` }
  );
}

/**
 * Run all applicable alerts based on current app state.
 * Call this once on Dashboard mount.
 */
export function runAutoAlerts({ logs = [], subjects = [] } = {}) {
  if (notificationPermission() !== 'granted') return;

  // Study gap
  if (logs.length > 0) {
    const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
    const hoursSince = (Date.now() - sorted[0].timestamp) / 3_600_000;
    if (hoursSince > 48) triggerStudyGapAlert(hoursSince);
  }

  // Low focus
  if (logs.length >= 3) {
    const recent = [...logs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
    const avgFocus = recent.reduce((s, l) => s + Number(l.focusLevel || 0), 0) / recent.length;
    if (avgFocus < 3) triggerLowFocusAlert(Math.round(avgFocus * 10) / 10);
  }

  // Missed tasks
  const totalMissed = logs.reduce((sum, l) => {
    const m = (l.missedTasks || '').trim();
    if (!m || m.toLowerCase() === 'none') return sum;
    return sum + m.split(/[,\n]+/).filter((t) => t.trim()).length;
  }, 0);
  if (totalMissed >= 2) triggerMissedTasksAlert(totalMissed);

  // Weak subjects
  const hardCounts = {};
  logs.forEach((l) => {
    if (l.difficulty === 'Hard' && l.subjectName) {
      hardCounts[l.subjectName] = (hardCounts[l.subjectName] || 0) + 1;
    }
  });
  Object.entries(hardCounts).forEach(([name, count]) => {
    if (count >= 2) triggerWeakSubjectAlert(name);
  });
}
