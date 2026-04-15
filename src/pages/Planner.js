import React, { useState, useEffect } from 'react';
import { generateSmartPlan, getSubjectPriorities } from '../utils/aiPlanner';
import { analyzePerformance } from '../utils/aiAnalysis';
import {
  generateAIPlan,
  checkBackendHealth,
  isOpenAIConfigured,
  AI_MODEL,
  estimateTokens,
} from '../utils/openaiService';
import {
  requestPermission,
  triggerPlanReadyAlert,
  notificationPermission,
} from '../utils/notificationService';

// ── Sub-Components ─────────────────────────────────────────

function SubjectForm({ onAdd }) {
  const [form, setForm] = useState({ name: '', type: 'GATE', examDate: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Subject name is required.');
      return;
    }
    onAdd({ ...form, name: form.name.trim(), id: Date.now() });
    setForm({ name: '', type: 'GATE', examDate: '' });
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="card form-section">
      <div className="card-title">➕ Add Subject</div>
      <div className="card-subtitle">Fill in the details and click Add</div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="subjectName">Subject Name</label>
          <input
            id="subjectName"
            name="name"
            className="form-input"
            placeholder="e.g. Control Systems"
            value={form.name}
            onChange={handleChange}
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="subjectType">Type</label>
          <select id="subjectType" name="type" className="form-select" value={form.type} onChange={handleChange}>
            <option value="GATE">GATE</option>
            <option value="College">College</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="examDate">Exam Date</label>
          <input
            id="examDate"
            name="examDate"
            type="date"
            className="form-input"
            value={form.examDate}
            onChange={handleChange}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary">
        ➕ Add Subject
      </button>
    </form>
  );
}

function SubjectList({ subjects, onDelete }) {
  if (subjects.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📭</div>
        <div className="empty-state-title">No subjects added yet</div>
        <div className="empty-state-desc">Use the form above to add your first subject</div>
      </div>
    );
  }

  return (
    <div className="subject-list">
      {subjects.map((s) => (
        <div className="subject-item fade-in" key={s.id}>
          <div className="subject-info">
            <div className="subject-name">{s.name}</div>
            <div className="subject-meta">
              {s.examDate ? (
                <>
                  <span>📅 {new Date(s.examDate + 'T00:00:00').toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}</span>
                  <span>·</span>
                  <span>
                    {Math.max(0, Math.ceil(
                      (new Date(s.examDate) - new Date()) / 86400000
                    ))} days left
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>No exam date set</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`badge badge-${s.type === 'GATE' ? 'gate' : 'college'}`}>
              {s.type}
            </span>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onDelete(s.id)}
              title="Delete subject"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Reason tag colours
function ReasonTag({ reason }) {
  let bg = 'rgba(59,130,246,0.12)';
  let color = 'var(--accent-blue-light)';

  if (reason.toLowerCase().includes('weak') || reason.toLowerCase().includes('hard')) {
    bg = 'rgba(239,68,68,0.12)'; color = 'var(--accent-red)';
  } else if (reason.toLowerCase().includes('missed')) {
    bg = 'rgba(245,158,11,0.12)'; color = 'var(--accent-orange)';
  } else if (reason.toLowerCase().includes('exam') || reason.toLowerCase().includes('urgent')) {
    bg = 'rgba(139,92,246,0.12)'; color = '#a78bfa';
  } else if (reason.toLowerCase().includes('active') || reason.toLowerCase().includes('strong')) {
    bg = 'rgba(16,185,129,0.12)'; color = 'var(--accent-green)';
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
      fontWeight: '600', background: bg, color, marginRight: '4px', marginBottom: '4px',
    }}>
      {reason}
    </span>
  );
}

// ── Loading Skeleton ──────────────────────────────────────
function PlanSkeleton() {
  return (
    <div className="card fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', animation: 'pulse-glow 1.2s ease-in-out infinite',
        }}>
          🧠
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
            GPT is thinking…
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Analysing your subjects, logs &amp; weak areas
          </div>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          height: '70px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          marginBottom: '10px', overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
            animation: `shimmer ${0.8 + i * 0.15}s ease-in-out infinite`,
          }} />
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

// ── Plan Display ──────────────────────────────────────────
function PlanDisplay({ plan, planSource }) {
  if (!plan || plan.length === 0) return null;

  const totalMinutes = plan.reduce((sum, item) => {
    const match = item.time.match(/(\d+\.?\d*)(h|m)/);
    if (!match) return sum;
    return sum + (match[2] === 'h' ? parseFloat(match[1]) * 60 : parseFloat(match[1]));
  }, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const isAI = planSource === 'openai' || plan.some((p) => p.source === 'openai');

  return (
    <div className="card fade-in" style={{
      borderColor: isAI ? 'rgba(139,92,246,0.3)' : 'var(--border)',
    }}>
      <div className="section-header">
        <div className="card-title">
          {isAI ? '🤖 AI-Generated Plan' : '✅ Smart Plan'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Total: <strong style={{ color: 'var(--accent-blue-light)' }}>{totalHours}h</strong>
          </span>
          {isAI && (
            <span style={{
              fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              color: 'white',
            }}>
              GPT ✨
            </span>
          )}
        </div>
      </div>
      <div className="card-subtitle" style={{ marginBottom: '16px' }}>
        {isAI
          ? '🤖 Generated by OpenAI · Personalised to your weak areas & logs · Visible on Dashboard'
          : '⚡ Rule-based smart plan · Visible on Dashboard too'}
      </div>

      <div className="plan-list">
        {plan.map((item, idx) => (
          <div className="plan-item" key={idx} style={{
            flexDirection: 'column', alignItems: 'stretch', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="plan-number">{idx + 1}</div>
              <div className="plan-details" style={{ flex: 1 }}>
                <div className="plan-subject">{item.subject}</div>
                <div className="plan-desc" style={{ marginBottom: (item.reasons?.length || item.reason) ? '6px' : 0 }}>
                  <span className={`badge badge-${item.type === 'GATE' ? 'gate' : 'college'}`}>
                    {item.type}
                  </span>
                  {' '}·{' '}
                  <span style={{
                    color: item.tag === 'Urgent'   ? 'var(--accent-red)'    :
                           item.tag === 'Revision' ? 'var(--accent-orange)' :
                           'var(--text-muted)',
                    fontWeight: item.tag === 'Urgent' ? '700' : '400',
                    fontSize: '12px',
                  }}>
                    {item.tag === 'Urgent' ? '🚨 ' : ''}{item.tag}
                  </span>
                </div>
                {/* Reason string from backend */}
                {item.reason && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--accent-blue-light)', fontWeight: '600' }}>Why: </span>
                    {item.reason}
                  </div>
                )}
                {/* Legacy Reason tags */}
                {item.reasons && item.reasons.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {item.reasons.map((r, i) => <ReasonTag key={i} reason={r} />)}
                  </div>
                )}
              </div>
              <div className="plan-time">⏱ {item.time}</div>
            </div>

            {/* AI personalised note */}
            {item.aiNote && (
              <div style={{
                marginLeft: '46px',
                background: 'rgba(139,92,246,0.07)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '6px', padding: '8px 12px',
                fontSize: '12px', color: 'var(--text-secondary)',
                lineHeight: '1.5',
              }}>
                <span style={{ color: '#a78bfa', fontWeight: '700' }}>💡 AI: </span>
                {item.aiNote}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Priority Panel ─────────────────────────────────────
function PriorityPanel({ subjects, logs }) {
  const [open, setOpen] = useState(false);
  const priorities = getSubjectPriorities(subjects, logs);

  if (priorities.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="card-title" style={{ marginBottom: 0 }}>🤖 AI Priority Scores</div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {open ? '▲ Hide' : '▼ Show'}
        </span>
      </div>
      {open && (
        <div className="fade-in" style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Subjects sorted by AI priority. Higher score = chosen first for your plan.
          </p>
          {priorities.map((s, i) => {
            const maxScore = priorities[0].score || 1;
            const pct = Math.min(100, Math.round((s.score / maxScore) * 100));
            return (
              <div key={s.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    #{i + 1} {s.name}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Score: <strong style={{ color: 'var(--accent-blue-light)' }}>{s.score}</strong>
                  </span>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                {s.reasons.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap' }}>
                    {s.reasons.map((r, ri) => <ReasonTag key={ri} reason={r} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── OpenAI Status Banner ──────────────────────────────────
function OpenAIStatusBanner({ tokens, backendOnline, notifGranted, onNotifRequest }) {
  const model = AI_MODEL;

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Backend Status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
        background: backendOnline === true ? 'rgba(16,185,129,0.07)' : 
                   backendOnline === false ? 'rgba(239,68,68,0.07)' : 'var(--bg-secondary)',
        border: `1px solid ${backendOnline === true ? 'rgba(16,185,129,0.2)' : 
                          backendOnline === false ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)', fontSize: '12px', marginBottom: '8px',
      }}>
        <span style={{ fontSize: '16px' }}>
          {backendOnline === true ? '🟢' : backendOnline === false ? '🔴' : '🟡'}
        </span>
        <div style={{ flex: 1 }}>
          <span style={{ 
            color: backendOnline === true ? 'var(--accent-green)' : 
                   backendOnline === false ? 'var(--accent-red)' : 'var(--text-muted)', 
            fontWeight: '700' 
          }}>
            {backendOnline === true ? 'Backend Online' : 
             backendOnline === false ? 'Backend Offline' : 'Checking Backend...'}
          </span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
            Model: <code style={{ color: 'var(--accent-cyan)' }}>{model}</code>
            {tokens > 0 && <span> · ~<strong>{tokens.toLocaleString()}</strong> tokens/request</span>}
          </span>
        </div>
      </div>

      {/* Notifications Status */}
      {!notifGranted && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '10px 14px', background: 'rgba(59,130,246,0.07)', 
          border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🔔</span>
            <span style={{ color: 'var(--text-secondary)' }}>Enable study alerts & reminders?</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onNotifRequest}>
            Enable
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Planner Page ──────────────────────────────────────
function Planner({ subjects, setSubjects, todayPlan, setTodayPlan, logs }) {
  const [isLoading, setIsLoading] = useState(false);
  const [planSource, setPlanSource] = useState(null);  // 'openai' | 'smart' | 'fallback'
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [useAI, setUseAI] = useState(true); // default ON — backend handles key check
  const [backendOnline, setBackendOnline] = useState(null); // null=checking, true/false
  const [notifGranted, setNotifGranted] = useState(notificationPermission() === 'granted');

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then((ok) => {
      setBackendOnline(ok);
      if (!ok) setUseAI(false); // auto-fall back to smart plan
    });
  }, []);

  const showNotice = (type, text, duration = 6000) => {
    setNotice({ type, text });
    if (duration) setTimeout(() => setNotice({ type: '', text: '' }), duration);
  };

  const handleAdd = (subject) => {
    setSubjects((prev) => [...prev, subject]);
  };

  const handleDelete = (id) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTodayPlan(null);
    setPlanSource(null);
  };

  // ── Main generate handler (async) ────────────────────────
  const handleGenerate = async () => {
    if (subjects.length === 0) {
      showNotice('error', '⚠️ Add at least one subject before generating a plan.');
      return;
    }

    setIsLoading(true);
    setNotice({ type: '', text: '' });

    // ── Path A: Backend AI ────────────────────────────────
    if (useAI && backendOnline) {
      try {
        const analysis = analyzePerformance(logs, subjects);
        const plan = await generateAIPlan(subjects, logs, analysis);
        setTodayPlan(plan);
        setPlanSource('openai');
        showNotice('success', `✨ AI plan ready! ${plan.length} sessions · Personalised to your weak areas.`);
        // Fire browser notification
        triggerPlanReadyAlert(plan.length);
      } catch (err) {
        console.error('[Backend] Plan generation failed:', err.message);
        // ── Fallback to smart rule-based ─────────────────
        const fallback = generateSmartPlan(subjects, logs);
        setTodayPlan(fallback);
        setPlanSource('fallback');
        showNotice(
          'warning',
          `⚠️ Backend error: ${err.message}. Showing smart rule-based plan instead.`,
          10000
        );
      }
    } else {
      // ── Path B: Rule-based smart planner ─────────────
      const plan = generateSmartPlan(subjects, logs);
      setTodayPlan(plan);
      setPlanSource('smart');
      showNotice('success', '✅ Smart plan generated using local priority scoring from your logs.');
    }

    setIsLoading(false);
  };

  // ── Request notification permission ──────────────────────
  const handleRequestNotif = async () => {
    const granted = await requestPermission();
    setNotifGranted(granted);
    if (granted) {
      showNotice('success', '🔔 Notifications enabled! You\'ll get alerts for plan ready, missed tasks, and low focus.');
    } else {
      showNotice('error', '🔕 Notification permission denied. Enable in browser settings.');
    }
  };

  const gateCount    = subjects.filter((s) => s.type === 'GATE').length;
  const collegeCount = subjects.filter((s) => s.type === 'College').length;
  const tokenEst     = subjects.length > 0 ? estimateTokens(subjects, logs) : 0;

  const noticeClass = notice.type === 'success' ? 'alert-success' : 'alert-error';

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">📚 Planner</h1>
        <p className="page-subtitle">
          Manage your subjects and generate a personalised daily study plan
        </p>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: '1', minWidth: '120px', padding: '16px' }}>
          <div className="stat-value" style={{ fontSize: '24px', color: 'var(--accent-blue-light)' }}>
            {subjects.length}
          </div>
          <div className="stat-label">Total Subjects</div>
        </div>
        <div className="stat-card" style={{ flex: '1', minWidth: '120px', padding: '16px' }}>
          <div className="stat-value" style={{ fontSize: '24px', color: '#a78bfa' }}>{gateCount}</div>
          <div className="stat-label">GATE Subjects</div>
        </div>
        <div className="stat-card" style={{ flex: '1', minWidth: '120px', padding: '16px' }}>
          <div className="stat-value" style={{ fontSize: '24px', color: 'var(--accent-cyan)' }}>
            {collegeCount}
          </div>
          <div className="stat-label">College Subjects</div>
        </div>
        <div className="stat-card" style={{ flex: '1', minWidth: '120px', padding: '16px' }}>
          <div className="stat-value" style={{ fontSize: '24px', color: 'var(--accent-green)' }}>
            {logs.length}
          </div>
          <div className="stat-label">Logs (AI input)</div>
        </div>
      </div>

      {/* Add Subject Form */}
      <SubjectForm onAdd={handleAdd} />

      <hr className="divider" />

      {/* Subject List */}
      <div style={{ marginBottom: '24px' }}>
        <div className="section-header">
          <div className="section-title">
            📋 Subject List
            <span style={{
              background: 'var(--accent-blue)', color: 'white',
              fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: '700',
            }}>
              {subjects.length}
            </span>
          </div>
        </div>
        <SubjectList subjects={subjects} onDelete={handleDelete} />
      </div>

      <hr className="divider" />

      {/* AI Priority Panel */}
      {subjects.length > 0 && <PriorityPanel subjects={subjects} logs={logs} />}

      {/* ── Generate Plan Section ───────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div className="section-header" style={{ marginBottom: '14px' }}>
          <div className="section-title">🗓️ Plan Generator</div>
        </div>

        {/* OpenAI status banner */}
        <OpenAIStatusBanner 
          tokens={tokenEst} 
          backendOnline={backendOnline}
          notifGranted={notifGranted}
          onNotifRequest={handleRequestNotif}
        />

        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: '0', marginBottom: '16px',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
          padding: '4px', border: '1px solid var(--border)',
        }}>
          <button
            onClick={() => setUseAI(true)}
            disabled={!isOpenAIConfigured()}
            style={{
              flex: 1, padding: '8px 12px', border: 'none', cursor: isOpenAIConfigured() ? 'pointer' : 'not-allowed',
              borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '600',
              transition: 'all 0.2s',
              background: useAI && isOpenAIConfigured()
                ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))'
                : 'transparent',
              color: useAI && isOpenAIConfigured() ? 'white' : 'var(--text-muted)',
              opacity: isOpenAIConfigured() ? 1 : 0.5,
            }}
          >
            🤖 OpenAI Plan
          </button>
          <button
            onClick={() => setUseAI(false)}
            style={{
              flex: 1, padding: '8px 12px', border: 'none', cursor: 'pointer',
              borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '600',
              transition: 'all 0.2s',
              background: !useAI || !isOpenAIConfigured()
                ? 'linear-gradient(135deg, var(--accent-green), #059669)'
                : 'transparent',
              color: !useAI || !isOpenAIConfigured() ? 'white' : 'var(--text-secondary)',
            }}
          >
            ⚡ Smart Plan
          </button>
        </div>

        {/* Mode description */}
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.7' }}>
          {useAI && isOpenAIConfigured() ? (
            <>
              <strong style={{ color: 'var(--text-secondary)' }}>OpenAI mode:</strong>{' '}
              Sends your subjects, logs &amp; weak areas to <strong style={{ color: 'var(--accent-blue-light)' }}>
              {AI_MODEL}</strong>. Gets a personalised plan with GATE mentor advice and per-session AI notes.
            </>
          ) : (
            <>
              <strong style={{ color: 'var(--text-secondary)' }}>Smart mode:</strong>{' '}
              Picks the highest-priority GATE subject (2h) + College subject (1.5h) + Revision subject (1h)
              using local priority scoring — no API call needed.
            </>
          )}
        </p>

        {/* Notice */}
        {notice.text && (
          <div className={`alert ${noticeClass}`} style={{ marginBottom: '14px' }}>
            {notice.text}
          </div>
        )}

        {/* Generate button */}
        <button
          className={`btn btn-lg ${useAI && isOpenAIConfigured() ? 'btn-primary' : 'btn-success'}`}
          onClick={handleGenerate}
          disabled={isLoading}
          style={{ minWidth: '220px' }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite', display: 'inline-block',
              }} />
              {useAI && isOpenAIConfigured() ? 'Asking GPT…' : 'Generating…'}
            </span>
          ) : (
            useAI && isOpenAIConfigured()
              ? '🤖 Generate with OpenAI'
              : '⚡ Generate Smart Plan'
          )}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Loading skeleton */}
      {isLoading && <PlanSkeleton />}

      {/* Plan display */}
      {!isLoading && todayPlan && (
        <PlanDisplay plan={todayPlan} planSource={planSource} />
      )}
    </div>
  );
}

export default Planner;
