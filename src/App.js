import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import MockPredictor from './pages/MockPredictor';
import DailyLog from './pages/DailyLog';
import AICommand from './pages/AICommand';

// ── localStorage helpers ───────────────────────────────────
const LS_KEYS = {
  subjects:        'aistudyos_subjects',
  logs:            'aistudyos_logs',
  todayPlan:       'aistudyos_todayPlan',
  appliedFeatures: 'aistudyos_applied_features',
};

function loadFromLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

// ── Default seed subjects (used only when LS is empty) ────
const DEFAULT_SUBJECTS = [
  { id: 1, name: 'Digital Electronics', type: 'GATE',    examDate: '2027-02-01' },
  { id: 2, name: 'Signals & Systems',   type: 'GATE',    examDate: '2027-02-01' },
  { id: 3, name: 'VLSI Design',         type: 'College', examDate: '2026-05-10' },
];

// ── App ───────────────────────────────────────────────────
function App() {
  // ── State – initialised from localStorage (or defaults) ──
  const [subjects, setSubjects] = useState(() =>
    loadFromLS(LS_KEYS.subjects, DEFAULT_SUBJECTS)
  );
  const [todayPlan, setTodayPlan] = useState(() =>
    loadFromLS(LS_KEYS.todayPlan, null)
  );
  const [logs, setLogs] = useState(() =>
    loadFromLS(LS_KEYS.logs, [])
  );
  // Part 8D: virtual applied features list
  const [appliedFeatures, setAppliedFeatures] = useState(() =>
    loadFromLS(LS_KEYS.appliedFeatures, [])
  );

  // ── Persist on change ─────────────────────────────────────
  useEffect(() => { saveToLS(LS_KEYS.subjects,        subjects);        }, [subjects]);
  useEffect(() => { saveToLS(LS_KEYS.logs,            logs);            }, [logs]);
  useEffect(() => { saveToLS(LS_KEYS.todayPlan,       todayPlan);       }, [todayPlan]);
  useEffect(() => { saveToLS(LS_KEYS.appliedFeatures, appliedFeatures); }, [appliedFeatures]);

  return (
    <Router>
      <div className="app-layout">
        <Sidebar appliedFeaturesCount={appliedFeatures.length} />
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  subjects={subjects}
                  todayPlan={todayPlan}
                  logs={logs}
                  appliedFeatures={appliedFeatures}
                />
              }
            />
            <Route
              path="/planner"
              element={
                <Planner
                  subjects={subjects}
                  setSubjects={setSubjects}
                  todayPlan={todayPlan}
                  setTodayPlan={setTodayPlan}
                  logs={logs}
                />
              }
            />
            <Route path="/predictor" element={<MockPredictor subjects={subjects} logs={logs} />} />
            <Route
              path="/daily-log"
              element={<DailyLog logs={logs} setLogs={setLogs} subjects={subjects} />}
            />
            <Route
              path="/ai-command"
              element={
                <AICommand
                  appliedFeatures={appliedFeatures}
                  setAppliedFeatures={setAppliedFeatures}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
