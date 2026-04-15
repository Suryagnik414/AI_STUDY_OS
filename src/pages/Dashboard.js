import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzePerformance, generateAlerts, getWeeklyInsights } from '../utils/aiAnalysis';
import { COMPLEXITY_META } from '../utils/aiCommandEngine';
import { runAutoAlerts } from '../utils/notificationService';

// ─── Tiny helper components ────────────────────────────────
function StatCard({ icon, value, label, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ─── 7B: AI Alert Banner ───────────────────────────────────
function AlertBanner({ alert, onDismiss }) {
  const borderColor = {
    danger:  'rgba(239,68,68,0.35)',
    warning: 'rgba(245,158,11,0.35)',
    success: 'rgba(16,185,129,0.35)',
    info:    'rgba(59,130,246,0.35)',
  }[alert.type] || 'var(--border)';

  const bgColor = {
    danger:  'rgba(239,68,68,0.07)',
    warning: 'rgba(245,158,11,0.07)',
    success: 'rgba(16,185,129,0.07)',
    info:    'rgba(59,130,246,0.07)',
  }[alert.type] || 'transparent';

  const titleColor = {
    danger:  'var(--accent-red)',
    warning: 'var(--accent-orange)',
    success: 'var(--accent-green)',
    info:    'var(--accent-blue-light)',
  }[alert.type] || 'var(--text-primary)';

  return (
    <div
      className="fade-in"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        background: bgColor, border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-sm)', padding: '12px 14px',
        marginBottom: '8px', position: 'relative',
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: '1', flexShrink: 0, marginTop: '1px' }}>
        {alert.icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: titleColor, marginBottom: '3px' }}>
          {alert.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {alert.message}
        </div>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '16px', lineHeight: '1',
          flexShrink: 0, padding: '2px',
        }}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── 7A: Per-subject Performance Table ────────────────────
function PerformanceTable({ performance }) {
  const rows = Object.entries(performance).filter(([, v]) => v.totalSessions > 0);
  if (rows.length === 0) return null;

  const strengthMeta = {
    Weak:    { color: 'var(--accent-red)',     bg: 'rgba(239,68,68,0.12)',   icon: '🔴' },
    Medium:  { color: 'var(--accent-orange)',  bg: 'rgba(245,158,11,0.12)',  icon: '🟡' },
    Strong:  { color: 'var(--accent-green)',   bg: 'rgba(16,185,129,0.12)',  icon: '🟢' },
    Unknown: { color: 'var(--text-muted)',     bg: 'rgba(100,116,139,0.12)', icon: '⚪' },
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Subject', 'Type', 'Sessions', 'Hard', 'Missed', 'Consistency', 'Avg Focus', 'Strength'].map((h) => (
              <th key={h} style={{
                padding: '8px 10px', textAlign: 'left', fontSize: '11px',
                fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.05em', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, v]) => {
            const m = strengthMeta[v.strength] || strengthMeta.Unknown;
            return (
              <tr
                key={name}
                style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '10px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {name}
                </td>
                <td style={{ padding: '10px' }}>
                  <span className={`badge badge-${v.type === 'GATE' ? 'gate' : 'college'}`}>
                    {v.type}
                  </span>
                </td>
                <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{v.totalSessions}</td>
                <td style={{ padding: '10px', color: v.hardCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                  {v.hardCount}
                </td>
                <td style={{ padding: '10px', color: v.missedCount > 0 ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
                  {v.missedCount}
                </td>
                <td style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1, background: 'var(--border)', borderRadius: '4px', height: '6px', minWidth: '60px' }}>
                      <div style={{
                        height: '100%', borderRadius: '4px',
                        width: `${Math.round(v.consistencyScore * 100)}%`,
                        background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
                      }} />
                    </div>
                    <span style={{ color: 'var(--text-muted)', minWidth: '30px' }}>
                      {Math.round(v.consistencyScore * 100)}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                  {v.avgFocus.toFixed(1)}/5
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                    fontWeight: '700', background: m.bg, color: m.color,
                  }}>
                    {m.icon} {v.strength}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── 7C: Weekly Insight Card ───────────────────────────────
function WeeklyInsightCard({ insights }) {
  const { totalHours, avgFocus, mostWeakSubject, hardSessionCount,
          missedTaskCount, trend, streak, weekLogs } = insights;

  const trendMeta = {
    Improving:        { color: 'var(--accent-green)',  icon: '📈' },
    Declining:        { color: 'var(--accent-red)',    icon: '📉' },
    Stable:           { color: 'var(--accent-orange)', icon: '➡️' },
    'Not enough data':{ color: 'var(--text-muted)',    icon: '📊' },
  };
  const tm = trendMeta[trend] || trendMeta['Not enough data'];

  if (weekLogs.length === 0) {
    return (
      <div className="card">
        <div className="card-title">📅 Weekly Insight</div>
        <div className="card-subtitle">Last 7 logged sessions</div>
        <div className="empty-state" style={{ padding: '24px' }}>
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No data yet</div>
          <div className="empty-state-desc">Log some study sessions to see insights here.</div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Hours (7 sessions)',   value: `${totalHours}h`,        color: 'var(--accent-blue-light)' },
    { label: 'Avg Focus',            value: `${avgFocus}/5`,         color: 'var(--accent-orange)' },
    { label: 'Hard Sessions',        value: hardSessionCount,         color: 'var(--accent-red)' },
    { label: 'Missed Tasks',         value: missedTaskCount,          color: 'var(--accent-orange)' },
    { label: 'Study Streak',         value: `${streak}d`,            color: 'var(--accent-green)' },
  ];

  return (
    <div className="card">
      <div className="section-header">
        <div className="card-title">📅 Weekly Insight</div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Based on last {weekLogs.length} session{weekLogs.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="card-subtitle" style={{ marginBottom: '16px' }}>
        Self-learning analysis of your recent performance
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: 'var(--bg-primary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: '100px', flex: '1',
          }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trend + Most Weak */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '12px',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>TREND</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: tm.color }}>
            {tm.icon} {trend}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {trend === 'Improving'          && 'Keep it up! Focus is rising.'}
            {trend === 'Declining'          && 'Your focus has been dipping.'}
            {trend === 'Stable'             && 'Consistent performance.'}
            {trend === 'Not enough data'    && 'Log more sessions for trend analysis.'}
          </div>
        </div>

        {mostWeakSubject && (
          <div style={{
            flex: 1, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-sm)', padding: '12px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>MOST WEAK SUBJECT</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-red)' }}>
              📌 {mostWeakSubject}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Rated Hard most often this week
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────
function Dashboard({ subjects, todayPlan, logs, appliedFeatures = [] }) {
  const navigate = useNavigate();

  // Run auto-alerts (browser notifications) on mount
  useEffect(() => {
    runAutoAlerts({ logs, subjects });
  }, [logs, subjects]);

  // ── Part 7A: Performance analysis ─────────────────────────
  const performance = analyzePerformance(logs, subjects);

  // ── Part 7B: Smart alerts (with dismiss support) ───────────
  const allAlerts   = generateAlerts(logs, subjects);
  const [dismissed, setDismissed] = useState([]);
  const visibleAlerts = allAlerts.filter((a) => !dismissed.includes(a.id));
  const handleDismiss = (id) => setDismissed((prev) => [...prev, id]);

  // ── Part 7C: Weekly insights ───────────────────────────────
  const weeklyInsights = getWeeklyInsights(logs);

  // ── Existing metrics ───────────────────────────────────────
  const gateSubjects    = subjects.filter((s) => s.type === 'GATE');
  const collegeSubjects = subjects.filter((s) => s.type === 'College');
  const totalHours      = logs.reduce((sum, l) => sum + Number(l.hoursStudied || 0), 0);
  const avgFocus        = logs.length > 0
    ? (logs.reduce((sum, l) => sum + Number(l.focusLevel || 0), 0) / logs.length).toFixed(1)
    : '—';

  const upcoming = subjects
    .filter((s) => s.examDate)
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))[0];
  const daysUntil = upcoming
    ? Math.max(0, Math.ceil((new Date(upcoming.examDate) - new Date()) / 86400000))
    : null;

  const weakSubjects = [
    ...new Set(
      logs.filter((l) => l.difficulty === 'Hard').map((l) => l.subjectName).filter(Boolean)
    ),
  ];

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">🏠 Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's your AI-powered study overview.</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard icon="📚" value={subjects.length}       label="Total Subjects"   color="var(--accent-blue-light)" />
        <StatCard icon="🎯" value={gateSubjects.length}   label="GATE Subjects"    color="#a78bfa" />
        <StatCard icon="🏫" value={collegeSubjects.length} label="College Subjects" color="var(--accent-cyan)" />
        <StatCard icon="⏱️" value={`${totalHours}h`}     label="Hours Logged"     color="var(--accent-green)" />
      </div>

      {/* ── 7B: AI Alerts ─────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div className="section-header" style={{ marginBottom: '12px' }}>
          <div className="section-title">
            🚨 AI Alerts
            {visibleAlerts.length > 0 && (
              <span style={{
                background: 'var(--accent-red)', color: 'white',
                fontSize: '11px', padding: '2px 7px',
                borderRadius: '12px', fontWeight: '700',
              }}>
                {visibleAlerts.length}
              </span>
            )}
          </div>
          {dismissed.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setDismissed([])}
            >
              ↺ Restore all
            </button>
          )}
        </div>

        {visibleAlerts.length === 0 ? (
          <div style={{
            background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-sm)', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px',
            color: 'var(--accent-green)',
          }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <span>
              {logs.length === 0
                ? 'No alerts yet. Start logging sessions to get AI-powered feedback!'
                : 'No active alerts — everything looks good! Keep up the great work.'}
            </span>
          </div>
        ) : (
          visibleAlerts.map((alert) => (
            <AlertBanner key={alert.id} alert={alert} onDismiss={handleDismiss} />
          ))
        )}
      </div>

      {/* ── Two-column: Today's Plan + Progress ───────────── */}
      <div className="card-grid-2" style={{ marginBottom: '24px' }}>
        {/* Today's Plan */}
        <div className="card">
          <div className="card-title">📋 Today's Plan</div>
          <div className="card-subtitle">Generated by AI Smart Planner</div>

          {todayPlan ? (
            <div className="plan-list">
              {todayPlan.map((item, idx) => (
                <div className="plan-item" key={idx}>
                  <div className="plan-number">{idx + 1}</div>
                  <div className="plan-details">
                    <div className="plan-subject">{item.subject}</div>
                    <div className="plan-desc">{item.type} · {item.tag}</div>
                  </div>
                  <div className="plan-time">{item.time}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No plan generated yet</div>
              <div className="empty-state-desc">
                Go to <strong>Planner</strong> and click "Generate Smart Plan"
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
                onClick={() => navigate('/planner')}
              >
                → Go to Planner
              </button>
            </div>
          )}
        </div>

        {/* Progress Card */}
        <div className="card">
          <div className="card-title">📈 Progress</div>
          <div className="card-subtitle">Study metrics at a glance</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Focus */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Avg. Focus Level</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {avgFocus}{logs.length > 0 ? ' / 5' : ''}
                </span>
              </div>
              <div className="progress-bar-wrap">
                <div
                  className="progress-bar-fill"
                  style={{ width: logs.length > 0 ? `${(avgFocus / 5) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Sessions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sessions Logged</span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-blue-light)' }}>
                {logs.length}
              </span>
            </div>

            {/* Upcoming Exam */}
            {upcoming && (
              <div style={{
                background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)',
                padding: '12px', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>NEXT EXAM</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{upcoming.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--accent-orange)', fontWeight: '600', marginTop: '4px' }}>
                  ⏳ {daysUntil} days away
                </div>
              </div>
            )}

            {/* Weak Areas */}
            {weakSubjects.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                  ⚠️ WEAK AREAS (from logs)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {weakSubjects.map((ws, i) => (
                    <span key={i} className="badge badge-hard">{ws}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Last session */}
            {logs.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                  📊 LAST SESSION
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{logs[logs.length - 1].hoursStudied}h</strong> studied ·{' '}
                  Focus <strong style={{ color: 'var(--text-primary)' }}>{logs[logs.length - 1].focusLevel}/5</strong> ·{' '}
                  <span className={`badge badge-${(logs[logs.length - 1].difficulty || '').toLowerCase()}`}>
                    {logs[logs.length - 1].difficulty}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 7C: Weekly Insight ────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <WeeklyInsightCard insights={weeklyInsights} />
      </div>

      {/* ── 7A: Performance Table ─────────────────────────── */}
      {Object.values(performance).some((v) => v.totalSessions > 0) && (
        <div style={{ marginBottom: '24px' }}>
          <div className="card">
            <div className="card-title">🧠 Self-Learning Analysis</div>
            <div className="card-subtitle" style={{ marginBottom: '16px' }}>
              AI-computed strength levels per subject — used to adjust your plan priority
            </div>
            <PerformanceTable performance={performance} />
          </div>
        </div>
      )}

      {/* ── Subject Overview ───────────────────────────────── */}
      <div className="card">
        <div className="card-title">📚 Subject Overview</div>
        <div className="card-subtitle">All subjects at a glance</div>
        {subjects.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            No subjects yet. Add them in the <strong>Planner</strong>.
          </p>
        ) : (
          <div className="subject-list">
            {subjects.map((s) => {
              const perf = performance[s.name];
              const strengthMeta = {
                Weak:    { color: 'var(--accent-red)',   icon: '🔴' },
                Medium:  { color: 'var(--accent-orange)', icon: '🟡' },
                Strong:  { color: 'var(--accent-green)',  icon: '🟢' },
                Unknown: { color: 'var(--text-muted)',    icon: '⚪' },
              };
              const sm = strengthMeta[perf?.strength || 'Unknown'];
              return (
                <div className="subject-item" key={s.id}>
                  <div className="subject-info">
                    <div className="subject-name">{s.name}</div>
                    <div className="subject-meta">
                      {s.examDate && <span>📅 {new Date(s.examDate).toLocaleDateString()}</span>}
                      {perf && perf.totalSessions > 0 && (
                        <span style={{ color: sm.color, fontWeight: '600' }}>
                          · {sm.icon} {perf.strength}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`badge badge-${s.type === 'GATE' ? 'gate' : 'college'}`}>
                    {s.type}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Part 8D: Active AI Features section ───────────── */}
      {appliedFeatures && appliedFeatures.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div className="card">
            <div className="section-header" style={{ marginBottom: '14px' }}>
              <div className="card-title">🤖 Active AI Features</div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/ai-command')}
              >
                Manage →
              </button>
            </div>
            <div className="card-subtitle" style={{ marginBottom: '14px' }}>
              {appliedFeatures.length} feature{appliedFeatures.length !== 1 ? 's' : ''} approved via AI Command Center
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {appliedFeatures.map((feat) => {
                const cx = COMPLEXITY_META[feat.estimatedComplexity] || COMPLEXITY_META.Medium;
                return (
                  <div key={feat.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: 'var(--bg-primary)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                  }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{feat.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {feat.featureName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {feat.category} ·
                        <span style={{ color: cx.color, marginLeft: '4px' }}>
                          {feat.estimatedComplexity} complexity
                        </span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', color: 'var(--accent-green)',
                      background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '10px',
                    }}>✅ Active</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
