/**
 * aiCommandEngine.js
 * ──────────────────────────────────────────────────────────────
 * Part 8B + 8E
 *
 * Exports:
 *   generateCodeFromCommand(command)  → feature proposal object
 *   generateErrorFix(errorMsg)        → fix suggestion object
 *   COMMAND_HISTORY_KEY               → localStorage key
 * ──────────────────────────────────────────────────────────────
 */

// ── Feature templates (rule-based AI simulation) ──────────────
const FEATURE_RULES = [
  // ── Mock / Test tracker ─────────────────────────────────────
  {
    patterns: ['mock test', 'mock exam', 'test tracker', 'weekly test', 'practice test'],
    feature: {
      featureName: 'Weekly Mock Test Tracker',
      icon: '📝',
      description:
        'Adds a dedicated tracker for weekly mock tests. Records score, time taken, ' +
        'topic-wise accuracy, and compares results over time to show improvement trend.',
      category: 'Analytics',
      affectedFiles: ['src/pages/Planner.js', 'src/pages/Dashboard.js', 'src/utils/aiAnalysis.js'],
      codeChanges: [
        {
          file: 'src/pages/Planner.js',
          change: 'Add MockTestCard component with score input, subject picker, and date field.',
        },
        {
          file: 'src/pages/Dashboard.js',
          change: 'Render MockTestSummary in the Progress section with trend chart.',
        },
        {
          file: 'src/utils/aiAnalysis.js',
          change: 'Export analyzeMockTests(tests) → { avgScore, bestSubject, trend }.',
        },
      ],
      estimatedComplexity: 'Medium',
      priority: 'High',
    },
  },
  // ── Pomodoro / Timer ────────────────────────────────────────
  {
    patterns: ['pomodoro', 'timer', 'countdown', 'focus timer', 'study timer'],
    feature: {
      featureName: 'Pomodoro Study Timer',
      icon: '⏱️',
      description:
        'Embeds a configurable Pomodoro timer (25/5 or 50/10 cycles) into the Planner page. ' +
        'Plays a sound at session end and auto-logs a short study entry when the timer completes.',
      category: 'Productivity',
      affectedFiles: ['src/pages/Planner.js', 'src/components/PomodoroTimer.js'],
      codeChanges: [
        {
          file: 'src/components/PomodoroTimer.js',
          change: '[NEW] Self-contained timer with start/pause/reset, configurable work+break durations.',
        },
        {
          file: 'src/pages/Planner.js',
          change: 'Import and render <PomodoroTimer /> below the plan generator section.',
        },
      ],
      estimatedComplexity: 'Low',
      priority: 'Medium',
    },
  },
  // ── Reminder / Notification ─────────────────────────────────
  {
    patterns: ['reminder', 'notification', 'alarm', 'alert reminder', 'study reminder'],
    feature: {
      featureName: 'Smart Study Reminder',
      icon: '🔔',
      description:
        'Uses the Web Notifications API to send browser reminders before a scheduled study session. ' +
        'Lets user set a time; fires a notification 15 minutes before and at the session start.',
      category: 'Notifications',
      affectedFiles: ['src/pages/Planner.js', 'src/utils/reminderEngine.js'],
      codeChanges: [
        {
          file: 'src/utils/reminderEngine.js',
          change: '[NEW] scheduleReminder(time, subject) using setTimeout + Notification API.',
        },
        {
          file: 'src/pages/Planner.js',
          change: 'Add ReminderSetter component; calls scheduleReminder on form submit.',
        },
      ],
      estimatedComplexity: 'Low',
      priority: 'Medium',
    },
  },
  // ── Analytics / Charts ──────────────────────────────────────
  {
    patterns: ['analytics', 'chart', 'graph', 'statistics', 'report', 'visualization'],
    feature: {
      featureName: 'Advanced Study Analytics',
      icon: '📊',
      description:
        'Adds an Analytics page with SVG bar charts for hours studied per day, ' +
        'focus trend line, subject difficulty distribution, and weekly comparison heatmap.',
      category: 'Analytics',
      affectedFiles: ['src/pages/Analytics.js', 'src/App.js', 'src/components/Sidebar.js'],
      codeChanges: [
        {
          file: 'src/pages/Analytics.js',
          change: '[NEW] Full analytics page with SVG charts (no external library needed).',
        },
        {
          file: 'src/App.js',
          change: 'Add <Route path="/analytics"> with logs prop.',
        },
        {
          file: 'src/components/Sidebar.js',
          change: 'Add Analytics nav item with 📊 icon.',
        },
      ],
      estimatedComplexity: 'High',
      priority: 'High',
    },
  },
  // ── Notes / Flashcards ──────────────────────────────────────
  {
    patterns: ['notes', 'flashcard', 'flash card', 'notebook', 'quick notes', 'note'],
    feature: {
      featureName: 'Smart Notes & Flashcards',
      icon: '📓',
      description:
        'Lets users jot quick notes per subject and convert any note into a flashcard ' +
        'for spaced repetition. Cards are reviewed in the Daily Log session.',
      category: 'Learning',
      affectedFiles: ['src/pages/Notes.js', 'src/App.js', 'src/components/Sidebar.js'],
      codeChanges: [
        {
          file: 'src/pages/Notes.js',
          change: '[NEW] Notes page with subject filter, editor, and flashcard flip UI.',
        },
        {
          file: 'src/App.js',
          change: 'Add notes state (localStorage) + <Route path="/notes">.',
        },
        {
          file: 'src/components/Sidebar.js',
          change: 'Add Notes nav item with 📓 icon.',
        },
      ],
      estimatedComplexity: 'Medium',
      priority: 'Medium',
    },
  },
  // ── Planner improvement ─────────────────────────────────────
  {
    patterns: ['improve planner', 'better plan', 'smarter plan', 'planner logic', 'upgrade planner'],
    feature: {
      featureName: 'Adaptive Time Allocation',
      icon: '🧠',
      description:
        'Upgrades the smart planner to dynamically adjust time slots (e.g. 2.5h for weak ' +
        'subjects, 1h for strong ones) and include micro-revision blocks between main sessions.',
      category: 'AI Logic',
      affectedFiles: ['src/utils/aiPlanner.js'],
      codeChanges: [
        {
          file: 'src/utils/aiPlanner.js',
          change:
            'Modify generateSmartPlan: set time = "2.5h" when strength=Weak, ' +
            '"1h" when strength=Strong, add micro-revision slot (15m) between items.',
        },
      ],
      estimatedComplexity: 'Low',
      priority: 'High',
    },
  },
  // ── Calendar / Schedule ─────────────────────────────────────
  {
    patterns: ['calendar', 'schedule', 'timetable', 'weekly view', 'monthly view'],
    feature: {
      featureName: 'Study Calendar View',
      icon: '📅',
      description:
        'Adds a monthly calendar that colour-codes each day by study hours logged. ' +
        'Click a day to see that session\'s details. Integrates with Daily Logs.',
      category: 'Planning',
      affectedFiles: ['src/pages/Calendar.js', 'src/App.js', 'src/components/Sidebar.js'],
      codeChanges: [
        {
          file: 'src/pages/Calendar.js',
          change: '[NEW] Pure-CSS calendar grid with heat-map colouring from log data.',
        },
        {
          file: 'src/App.js',
          change: 'Add <Route path="/calendar"> with logs prop.',
        },
        {
          file: 'src/components/Sidebar.js',
          change: 'Add Calendar nav item with 📅 icon.',
        },
      ],
      estimatedComplexity: 'High',
      priority: 'Medium',
    },
  },
  // ── Goals / Targets ─────────────────────────────────────────
  {
    patterns: ['goal', 'target', 'objective', 'milestone', 'achievement'],
    feature: {
      featureName: 'Study Goals & Milestones',
      icon: '🏆',
      description:
        'Lets users define weekly/monthly study goals (hours, subjects covered, mock scores). ' +
        'Dashboard shows a progress ring for each goal and sends alerts when goals are at risk.',
      category: 'Gamification',
      affectedFiles: ['src/pages/Dashboard.js', 'src/utils/aiAnalysis.js'],
      codeChanges: [
        {
          file: 'src/pages/Dashboard.js',
          change: 'Add GoalsCard component with circular progress rings per goal.',
        },
        {
          file: 'src/utils/aiAnalysis.js',
          change: 'Export checkGoalProgress(goals, logs) → { met, percentage, risk }.',
        },
      ],
      estimatedComplexity: 'Medium',
      priority: 'High',
    },
  },
  // ── Spaced repetition ────────────────────────────────────────
  {
    patterns: ['spaced repetition', 'revision schedule', 'spacing', 'review schedule', 'srs'],
    feature: {
      featureName: 'Spaced Repetition Scheduler',
      icon: '🔄',
      description:
        'Implements a lightweight SM-2-inspired algorithm. Topics are scheduled for review ' +
        'after 1, 3, 7, 14, 30 days based on self-rated difficulty. Planner inserts due ' +
        'revision items automatically.',
      category: 'AI Logic',
      affectedFiles: ['src/utils/spacedRepetition.js', 'src/pages/Planner.js'],
      codeChanges: [
        {
          file: 'src/utils/spacedRepetition.js',
          change: '[NEW] getDueTopics(topics, ratings) using SM-2-style interval calculation.',
        },
        {
          file: 'src/pages/Planner.js',
          change: 'Show "Due for Revision" section using getDueTopics output.',
        },
      ],
      estimatedComplexity: 'High',
      priority: 'High',
    },
  },
  // ── Dark/Light mode ─────────────────────────────────────────
  {
    patterns: ['theme', 'dark mode', 'light mode', 'color scheme', 'appearance'],
    feature: {
      featureName: 'Theme Switcher',
      icon: '🌙',
      description:
        'Adds a light/dark mode toggle persisted to localStorage. ' +
        'Switches the CSS variable palette between the existing dark theme and a clean light theme.',
      category: 'UI/UX',
      affectedFiles: ['src/index.css', 'src/components/Sidebar.js'],
      codeChanges: [
        {
          file: 'src/index.css',
          change: 'Add :root[data-theme="light"] {} overrides for all CSS variables.',
        },
        {
          file: 'src/components/Sidebar.js',
          change: 'Add ThemeToggle button that sets document.documentElement dataset.theme.',
        },
      ],
      estimatedComplexity: 'Low',
      priority: 'Low',
    },
  },
];

// ── Complexity colour ─────────────────────────────────────────
export const COMPLEXITY_META = {
  Low:    { color: 'var(--accent-green)',  bg: 'rgba(16,185,129,0.12)'  },
  Medium: { color: 'var(--accent-orange)', bg: 'rgba(245,158,11,0.12)'  },
  High:   { color: 'var(--accent-red)',    bg: 'rgba(239,68,68,0.12)'   },
};

export const PRIORITY_META = {
  High:   { color: '#a78bfa', bg: 'rgba(139,92,246,0.12)' },
  Medium: { color: 'var(--accent-blue-light)', bg: 'rgba(59,130,246,0.12)' },
  Low:    { color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.12)' },
};

// ── Fallback for unknown commands ─────────────────────────────
function buildGenericFeature(command) {
  const trimmed = command.trim();
  const featureName = trimmed
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    featureName,
    icon: '⚙️',
    description:
      `Custom feature: "${trimmed}". This would add new functionality to the app. ` +
      'Review the affected files and approve to register it as an active feature.',
    category: 'Custom',
    affectedFiles: ['src/pages/Dashboard.js', 'src/App.js'],
    codeChanges: [
      {
        file: 'src/pages/Dashboard.js',
        change: `Add ${featureName} UI section with relevant data display.`,
      },
      {
        file: 'src/App.js',
        change: `Add ${featureName} state and pass as prop where needed.`,
      },
    ],
    estimatedComplexity: 'Medium',
    priority: 'Medium',
  };
}

/**
 * Part 8B — Main command interpreter.
 * Simulates AI parsing with rule-based pattern matching.
 *
 * Returns: { featureName, icon, description, category, affectedFiles,
 *            codeChanges, estimatedComplexity, priority, timestamp }
 */
export function generateCodeFromCommand(command) {
  if (!command || !command.trim()) return null;

  const lower = command.toLowerCase();

  // Find first matching rule
  const matched = FEATURE_RULES.find((rule) =>
    rule.patterns.some((p) => lower.includes(p))
  );

  const feature = matched ? { ...matched.feature } : buildGenericFeature(command);

  return {
    ...feature,
    originalCommand: command.trim(),
    timestamp: Date.now(),
    id: `feat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };
}

// ── Known error patterns → fix suggestions ────────────────────
const ERROR_FIXES = [
  {
    patterns: ['cannot read propert', 'cannot read properties', 'typeerror', 'is not a function'],
    fix: {
      title: 'Null / Undefined Reference',
      suggestion:
        'Add a null-check before accessing the property. ' +
        'Example: use optional chaining `obj?.prop` or guard with `if (obj) { ... }`.',
      severity: 'High',
    },
  },
  {
    patterns: ['maximum update depth', 'infinite loop', 'too many re-renders'],
    fix: {
      title: 'Infinite Re-render Loop',
      suggestion:
        'Check useEffect dependency arrays — a state update inside an effect that ' +
        'lists that state as a dependency will loop. Remove the dependency or add a condition.',
      severity: 'High',
    },
  },
  {
    patterns: ['each child in a list', 'key prop', 'unique key'],
    fix: {
      title: 'Missing React Key Prop',
      suggestion:
        'Add a unique `key` prop to each element in the `.map()` call. ' +
        'Use the item\'s ID or index: `items.map((item, i) => <div key={item.id || i}>)`.',
      severity: 'Medium',
    },
  },
  {
    patterns: ['localstorage', 'storage quota', 'quotaexceeded'],
    fix: {
      title: 'localStorage Quota Exceeded',
      suggestion:
        'Data stored in localStorage exceeds the 5 MB limit. ' +
        'Clear old log entries or compress data before saving. ' +
        'Consider limiting stored logs to the most recent 100.',
      severity: 'Medium',
    },
  },
  {
    patterns: ['failed to fetch', 'network error', 'cors', 'fetch'],
    fix: {
      title: 'Network / CORS Error',
      suggestion:
        'The fetch request failed. Verify the URL is correct and the server is running. ' +
        'For CORS issues, ensure the backend sets `Access-Control-Allow-Origin` headers.',
      severity: 'High',
    },
  },
  {
    patterns: ['syntaxerror', 'unexpected token', 'parse error'],
    fix: {
      title: 'JavaScript Syntax Error',
      suggestion:
        'There is a syntax error in the code — look for missing brackets, commas, or quotes. ' +
        'Check the stack trace for the exact file and line number.',
      severity: 'High',
    },
  },
  {
    patterns: ['import', 'module not found', 'cannot find module'],
    fix: {
      title: 'Missing Module / Bad Import Path',
      suggestion:
        'The import path is wrong or the package is not installed. ' +
        'Run `npm install <package-name>` if it\'s a dependency, ' +
        'or double-check the relative path for local files.',
      severity: 'High',
    },
  },
];

/**
 * Part 8E — Error analysis.
 * Takes a raw error message string and returns a structured fix suggestion.
 */
export function generateErrorFix(errorMsg) {
  if (!errorMsg) return null;
  const lower = errorMsg.toLowerCase();

  const match = ERROR_FIXES.find((rule) =>
    rule.patterns.some((p) => lower.includes(p))
  );

  if (match) {
    return {
      ...match.fix,
      originalError: errorMsg,
      timestamp: Date.now(),
      id: `err_${Date.now()}`,
    };
  }

  return {
    title: 'Unknown Runtime Error',
    suggestion:
      'Check the browser console for the full stack trace. Common causes include: ' +
      'undefined variables, wrong prop types, or bad state shape. ' +
      'Add `console.log` statements around the failing area to narrow down the issue.',
    severity: 'Medium',
    originalError: errorMsg,
    timestamp: Date.now(),
    id: `err_${Date.now()}`,
  };
}

export const COMMAND_HISTORY_KEY = 'aistudyos_cmd_history';
