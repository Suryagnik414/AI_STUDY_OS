import React, { useState } from 'react';

// ── Analysis helpers ───────────────────────────────────────
function analyzeLog(log) {
  const insights = [];

  const missed = (log.missedTasks || '').trim();
  if (missed && missed.toLowerCase() !== 'none' && missed !== '') {
    const count = missed.split(/[,\n]+/).filter((t) => t.trim()).length;
    insights.push({
      type: 'warning',
      icon: '⚠️',
      text: (
        <>
          You missed <strong>{count} task{count !== 1 ? 's' : ''}</strong>:{' '}
          <em>{missed}</em>. Mark them as <strong>high priority</strong> for tomorrow.
        </>
      ),
    });
  }

  const focus = Number(log.focusLevel);
  if (focus <= 2) {
    insights.push({
      type: 'danger',
      icon: '😴',
      text: (
        <>
          Your focus level was <strong>{focus}/5</strong> — quite low.{' '}
          Try Pomodoro technique or study breaks tomorrow.
        </>
      ),
    });
  } else if (focus >= 4) {
    insights.push({
      type: 'success',
      icon: '🔥',
      text: (
        <>
          Great focus level of <strong>{focus}/5</strong>! Keep the momentum going.
        </>
      ),
    });
  }

  if (log.difficulty === 'Hard') {
    insights.push({
      type: 'danger',
      icon: '📌',
      text: (
        <>
          Difficulty was <strong>Hard</strong>
          {log.subjectName ? (
            <>
              {' '}— <strong>{log.subjectName}</strong> is flagged as a{' '}
              <strong style={{ color: 'var(--accent-red)' }}>weak subject</strong>.
            </>
          ) : (
            <>. The subject may need extra practice.</>
          )}{' '}
          Consider extra practice sessions.
        </>
      ),
    });
  }

  const hours = Number(log.hoursStudied);
  if (hours < 2) {
    insights.push({
      type: 'warning',
      icon: '⏰',
      text: (
        <>
          Only <strong>{hours}h</strong> studied today. Try to aim for at least{' '}
          <strong>4–6h</strong> for consistent GATE prep.
        </>
      ),
    });
  } else if (hours >= 6) {
    insights.push({
      type: 'success',
      icon: '🏆',
      text: (
        <>
          Excellent! You studied for <strong>{hours}h</strong> today. Keep it consistent!
        </>
      ),
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'info',
      icon: '✅',
      text: <>Good session! No major issues detected. Stay consistent.</>,
    });
  }

  return insights;
}

// ── Log Entry Card ─────────────────────────────────────────
function LogCard({ log, index }) {
  const [showInsights, setShowInsights] = useState(false);
  const insights = analyzeLog(log);

  return (
    <div className="log-item fade-in">
      <div className="log-header">
        <div>
          <div className="log-date">
            📅 {new Date(log.timestamp).toLocaleDateString('en-IN', {
              weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
            })}
          </div>
          {log.subjectName && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Subject: <strong style={{ color: 'var(--text-secondary)' }}>{log.subjectName}</strong>
            </div>
          )}
        </div>
        <div className="log-stats">
          <span className="badge badge-medium" style={{ gap: '4px' }}>
            ⏱ {log.hoursStudied}h
          </span>
          <span className={`badge badge-${(log.difficulty || '').toLowerCase()}`}>
            {log.difficulty}
          </span>
        </div>
      </div>

      <div className="log-body">
        <div className="log-field">
          <div className="log-field-label">✅ Completed Tasks</div>
          <div className="log-field-value">{log.completedTasks || '—'}</div>
        </div>
        <div className="log-field">
          <div className="log-field-label">❌ Missed Tasks</div>
          <div className="log-field-value" style={{ color: log.missedTasks?.trim() ? 'var(--accent-red)' : 'inherit' }}>
            {log.missedTasks || '—'}
          </div>
        </div>
      </div>

      {/* Focus Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
          FOCUS LEVEL
        </div>
        <div className="focus-bar">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`focus-dot ${n <= Number(log.focusLevel) ? 'active' : ''}`}
            />
          ))}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
            {log.focusLevel}/5
          </span>
        </div>
      </div>

      {/* Insights toggle */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setShowInsights((v) => !v)}
      >
        {showInsights ? '🔼 Hide Insights' : '💡 Show Insights'}
      </button>

      {showInsights && (
        <div style={{ marginTop: '12px' }} className="fade-in">
          {insights.map((ins, i) => (
            <div key={i} className={`insight-card insight-${ins.type}`}>
              <span className="insight-icon">{ins.icon}</span>
              <div className="insight-text">{ins.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Global Insights from all logs ──────────────────────────
function GlobalInsights({ logs }) {
  if (logs.length === 0) return null;

  const totalMissed = logs.reduce((sum, l) => {
    const m = (l.missedTasks || '').trim();
    if (!m || m.toLowerCase() === 'none') return sum;
    return sum + m.split(/[,\n]+/).filter((t) => t.trim()).length;
  }, 0);

  const avgFocus = (
    logs.reduce((sum, l) => sum + Number(l.focusLevel || 0), 0) / logs.length
  ).toFixed(1);

  const weakSubjects = [
    ...new Set(
      logs.filter((l) => l.difficulty === 'Hard').map((l) => l.subjectName).filter(Boolean)
    ),
  ];

  const totalHours = logs.reduce((sum, l) => sum + Number(l.hoursStudied || 0), 0);

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-title">📊 Overall Insights</div>
      <div className="card-subtitle">Aggregated analysis across all sessions</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-blue-light)' }}>{logs.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sessions Logged</div>
        </div>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)' }}>{totalHours}h</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Hours</div>
        </div>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-orange)' }}>{avgFocus}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avg Focus / 5</div>
        </div>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-red)' }}>{totalMissed}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Missed Tasks</div>
        </div>
      </div>

      {totalMissed > 0 && (
        <div className="insight-card insight-warning">
          <span className="insight-icon">⚠️</span>
          <div className="insight-text">
            You've missed <strong>{totalMissed} total task{totalMissed !== 1 ? 's' : ''}</strong> across all sessions. Prioritize clearing your backlog.
          </div>
        </div>
      )}

      {Number(avgFocus) < 3 && (
        <div className="insight-card insight-danger">
          <span className="insight-icon">😴</span>
          <div className="insight-text">
            Average focus level is <strong>low ({avgFocus}/5)</strong>. Review your study environment, sleep, and
            break schedules.
          </div>
        </div>
      )}

      {weakSubjects.length > 0 && (
        <div className="insight-card insight-danger">
          <span className="insight-icon">📌</span>
          <div className="insight-text">
            <strong>Weak subjects identified:</strong>{' '}
            {weakSubjects.map((ws, i) => (
              <span key={i} className="badge badge-hard" style={{ marginRight: '4px' }}>{ws}</span>
            ))}
            . Schedule dedicated revision sessions.
          </div>
        </div>
      )}

      {totalMissed === 0 && Number(avgFocus) >= 3 && weakSubjects.length === 0 && (
        <div className="insight-card insight-success">
          <span className="insight-icon">🏆</span>
          <div className="insight-text">
            All looking great! No missed tasks, decent focus, and no weak subjects flagged yet.
            Keep up the consistency!
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main DailyLog Page ─────────────────────────────────────
function DailyLog({ logs, setLogs, subjects }) {
  const [form, setForm] = useState({
    completedTasks: '',
    missedTasks: '',
    focusLevel: '3',
    difficulty: 'Medium',
    hoursStudied: '',
    subjectName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.hoursStudied || isNaN(Number(form.hoursStudied)) || Number(form.hoursStudied) <= 0) {
      setError('Please enter a valid number of hours studied.');
      return;
    }
    if (!form.completedTasks.trim()) {
      setError('Please describe what you completed.');
      return;
    }
    const newLog = { ...form, timestamp: Date.now(), id: Date.now() };
    setLogs((prev) => [...prev, newLog]);
    setForm({
      completedTasks: '',
      missedTasks: '',
      focusLevel: '3',
      difficulty: 'Medium',
      hoursStudied: '',
      subjectName: '',
    });
    setError('');
    setSuccess('✅ Log saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">📝 Daily Log</h1>
        <p className="page-subtitle">Record each study session and get AI-style insights</p>
      </div>

      {/* Log Form */}
      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">📋 Log Today's Session</div>
        <div className="card-subtitle">Fill in the details of what you studied</div>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Row 1 */}
        <div className="form-grid" style={{ marginBottom: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="subjectName">Subject</label>
            <select id="subjectName" name="subjectName" className="form-select" value={form.subjectName} onChange={handleChange}>
              <option value="">-- Select Subject (optional) --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name} ({s.type})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="hoursStudied">Hours Studied</label>
            <input
              id="hoursStudied"
              name="hoursStudied"
              type="number"
              min="0.5"
              max="16"
              step="0.5"
              className="form-input"
              placeholder="e.g. 3.5"
              value={form.hoursStudied}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" name="difficulty" className="form-select" value={form.difficulty} onChange={handleChange}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Focus Level Slider */}
        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label className="form-label" htmlFor="focusLevel">
            Focus Level — {form.focusLevel}/5
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              id="focusLevel"
              name="focusLevel"
              type="range"
              min="1"
              max="5"
              step="1"
              value={form.focusLevel}
              onChange={handleChange}
              style={{ flex: 1, accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
            />
            <div className="focus-bar">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={`focus-dot ${n <= Number(form.focusLevel) ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Row 2 – text areas */}
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="completedTasks">✅ Completed Tasks</label>
            <textarea
              id="completedTasks"
              name="completedTasks"
              className="form-textarea"
              placeholder="List what you completed today&#10;e.g. Chapter 3 notes, solved 10 MCQs"
              value={form.completedTasks}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="missedTasks">❌ Missed Tasks</label>
            <textarea
              id="missedTasks"
              name="missedTasks"
              className="form-textarea"
              placeholder="What did you skip or couldn't finish?&#10;e.g. Chapter 4 reading, PYQ revision"
              value={form.missedTasks}
              onChange={handleChange}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg">
          💾 Save Log
        </button>
      </form>

      {/* Global Insights */}
      <GlobalInsights logs={logs} />

      {/* All Logs */}
      <div>
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div className="section-title">
            📜 Previous Logs
            <span
              style={{
                background: 'var(--accent-blue)',
                color: 'white',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '700',
              }}
            >
              {logs.length}
            </span>
          </div>
          {logs.length > 0 && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (window.confirm('Clear all logs?')) setLogs([]);
              }}
            >
              🗑️ Clear All
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No logs yet</div>
            <div className="empty-state-desc">
              Save your first session using the form above
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[...logs].reverse().map((log, i) => (
              <LogCard key={log.id} log={log} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyLog;
