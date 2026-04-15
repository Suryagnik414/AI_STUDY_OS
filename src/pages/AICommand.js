import React, { useState, useEffect, useRef } from 'react';
import {
  COMPLEXITY_META,
  PRIORITY_META,
  COMMAND_HISTORY_KEY,
} from '../utils/aiCommandEngine';
import { generateAICommand, analyzeError } from '../utils/openaiService';

// ── Suggestion chips ────────────────────────────────────────
const SUGGESTIONS = [
  'Add weekly mock test tracker',
  'Improve planner logic',
  'Add pomodoro timer',
  'Add study reminder',
  'Add analytics charts',
  'Add notes and flashcards',
  'Add study calendar',
  'Add goals and milestones',
  'Add spaced repetition',
  'Add theme switcher',
];

// ─── Small reusable components ──────────────────────────────

function MetaBadge({ label, value, colorStyle, bgStyle }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: '700', color: colorStyle, background: bgStyle,
    }}>
      {label}: {value}
    </div>
  );
}

function CodeChangeRow({ change, idx }) {
  return (
    <div style={{
      background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', marginBottom: '6px', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{
          width: '20px', height: '20px', background: 'var(--accent-blue)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: '800', color: 'white', flexShrink: 0,
        }}>
          {idx + 1}
        </span>
        <code style={{
          fontSize: '12px', color: 'var(--accent-cyan)',
          background: 'rgba(6,182,212,0.08)', padding: '2px 8px', borderRadius: '4px',
        }}>
          {change.file}
        </code>
        {change.change.startsWith('[NEW]') && (
          <span style={{
            fontSize: '10px', fontWeight: '700', color: 'var(--accent-green)',
            background: 'rgba(16,185,129,0.12)', padding: '1px 6px', borderRadius: '10px',
          }}>
            NEW FILE
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '28px', lineHeight: '1.5' }}>
        {change.change.replace('[NEW] ', '')}
      </div>
    </div>
  );
}

// ── Feature Proposal Card (8C) ──────────────────────────────
function FeatureProposal({ proposal, onApprove, onReject }) {
  const cx = COMPLEXITY_META[proposal.estimatedComplexity] || COMPLEXITY_META.Medium;
  const px = PRIORITY_META[proposal.priority]             || PRIORITY_META.Medium;
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="card fade-in"
      style={{
        borderColor: 'rgba(139,92,246,0.35)',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(139,92,246,0.04) 100%)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px' }}>{proposal.icon}</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {proposal.featureName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                Category: <strong style={{ color: 'var(--text-secondary)' }}>{proposal.category}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <MetaBadge label="Complexity" value={proposal.estimatedComplexity} colorStyle={cx.color} bgStyle={cx.bg} />
            <MetaBadge label="Priority"   value={proposal.priority}            colorStyle={px.color} bgStyle={px.bg} />
            <MetaBadge
              label="Files"
              value={proposal.affectedFiles.length}
              colorStyle="var(--accent-blue-light)"
              bgStyle="rgba(59,130,246,0.12)"
            />
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', padding: '4px', flexShrink: 0 }}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && (
        <div className="fade-in">
          {/* Description */}
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)',
            padding: '12px 14px', marginBottom: '14px', border: '1px solid var(--border)',
            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7',
          }}>
            {proposal.description}
          </div>

          {/* Affected files */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Affected Files
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {proposal.affectedFiles.map((f, i) => (
                <code key={i} style={{
                  fontSize: '11px', color: 'var(--accent-cyan)',
                  background: 'rgba(6,182,212,0.08)', padding: '3px 8px', borderRadius: '4px',
                  border: '1px solid rgba(6,182,212,0.2)',
                }}>
                  {f}
                </code>
              ))}
            </div>
          </div>

          {/* Code changes */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Proposed Code Changes
            </div>
            {/* Handle both codeChanges and steps array from different AI responses */}
            {(proposal.codeChanges || (proposal.steps && proposal.steps.map(s => ({ file: 'Multiple Files', change: s })))).map((c, i) => (
              <CodeChangeRow key={i} change={c} idx={i} />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons (8C) */}
      <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--border)', marginTop: expanded ? '4px' : '12px', paddingTop: '14px' }}>
        <button
          className="btn btn-success"
          style={{ flex: 1 }}
          onClick={() => onApprove(proposal)}
        >
          ✅ Approve & Apply
        </button>
        <button
          className="btn btn-danger"
          style={{ flex: 1 }}
          onClick={() => onReject(proposal.id)}
        >
          ❌ Reject
        </button>
      </div>
    </div>
  );
}

// ── Applied Feature Chip (8D) ────────────────────────────────
function AppliedFeatureCard({ feat, onRemove }) {
  const cx = COMPLEXITY_META[feat.estimatedComplexity] || COMPLEXITY_META.Medium;
  return (
    <div style={{
      background: 'var(--bg-primary)', border: '1px solid rgba(16,185,129,0.25)',
      borderRadius: 'var(--radius-sm)', padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <span style={{ fontSize: '22px', flexShrink: 0 }}>{feat.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
          {feat.featureName}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>✅ Active</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{feat.category}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: '11px', color: cx.color }}>{feat.estimatedComplexity}</span>
        </div>
      </div>
      <button
        className="btn btn-danger btn-sm"
        onClick={() => onRemove(feat.id)}
        title="Remove feature"
      >
        🗑️
      </button>
    </div>
  );
}

// ── Error Monitor (8E) ──────────────────────────────────────
function ErrorMonitor({ errors, onClear }) {
  if (errors.length === 0) {
    return (
      <div style={{
        background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 'var(--radius-sm)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
        fontSize: '13px', color: 'var(--accent-green)',
      }}>
        <span style={{ fontSize: '18px' }}>🟢</span>
        <span>No runtime errors detected. Error monitor is active.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {errors.map((e) => (
        <div key={e.fix.id} className="fade-in" style={{
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius-sm)', padding: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-red)' }}>
              🚨 {e.fix.title}
            </div>
            <span style={{
              fontSize: '11px', fontWeight: '700',
              color: e.fix.severity === 'High' ? 'var(--accent-red)' : 'var(--accent-orange)',
            }}>
              {e.fix.severity} Severity
            </span>
          </div>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: '4px',
            padding: '8px 10px', marginBottom: '10px',
            fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)',
            overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            border: '1px solid var(--border)',
          }}>
            {e.raw}
          </div>
          <div style={{
            background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '4px', padding: '8px 10px',
            fontSize: '12px', color: 'var(--accent-green)', lineHeight: '1.6',
          }}>
            <strong>Root Cause: </strong>{e.fix.rootCause}<br />
            <strong>💡 AI Fix Suggestion: </strong>{e.fix.fixSuggestion}
            {e.fix.codeExample && (
              <pre style={{ 
                marginTop: '8px', background: 'var(--bg-secondary)', padding: '8px', 
                borderRadius: '4px', color: 'var(--accent-cyan)', fontSize: '11px',
                border: '1px solid var(--border)', overflowX: 'auto'
              }}>
                {e.fix.codeExample}
              </pre>
            )}
          </div>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={onClear}>
        🗑️ Clear error log
      </button>
    </div>
  );
}

// ── Command History item ─────────────────────────────────────
function HistoryItem({ item }) {
  const statusMeta = {
    approved: { color: 'var(--accent-green)',  icon: '✅', label: 'Approved' },
    rejected: { color: 'var(--accent-red)',    icon: '❌', label: 'Rejected' },
    pending:  { color: 'var(--accent-orange)', icon: '⏳', label: 'Pending'  },
  };
  const s = statusMeta[item.status] || statusMeta.pending;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
      background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)', fontSize: '13px',
    }}>
      <span style={{ fontSize: '16px' }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{item.command}</span>
        {item.featureName && (
          <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>→ {item.featureName}</span>
        )}
      </div>
      <span style={{ fontSize: '11px', color: s.color, fontWeight: '700', flexShrink: 0 }}>
        {s.label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
function AICommand({ appliedFeatures, setAppliedFeatures }) {
  const [command, setCommand]     = useState('');
  const [proposal, setProposal]   = useState(null);   // current pending proposal
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice]       = useState(null);   // { type, text }
  const [history, setHistory]     = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(COMMAND_HISTORY_KEY) || '[]');
    } catch { return []; }
  });
  const [errors, setErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('command'); // 'command' | 'features' | 'errors'
  const inputRef = useRef(null);

  // ── Part 8E: attach global error listener ─────────────────
  useEffect(() => {
    const handler = async (msg, src, line, col, err) => {
      const raw = err ? err.toString() : msg;
      try {
        const fix = await analyzeError(raw);
        setErrors((prev) => {
          // Deduplicate by issue title
          if (prev.some((e) => e.fix.issue === fix.issue)) return prev;
          return [{ raw, fix }, ...prev].slice(0, 10);
        });
      } catch (e) {
        console.error('Error analysis failed:', e);
      }
      return false; // don't suppress the error
    };
    window.onerror = handler;
    return () => { window.onerror = null; };
  }, []);

  // ── Persist command history ────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(COMMAND_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    } catch {}
  }, [history]);

  // ── Call Backend AI Command API ──────────────────────────
  const handleSubmit = async (cmd) => {
    const text = (cmd || command).trim();
    if (!text) return;

    setIsLoading(true);
    setProposal(null);
    setNotice(null);
    setCommand('');

    try {
      const result = await generateAICommand(text);
      setProposal(result);
      setIsLoading(false);
      setActiveTab('command');
      // Add to history as pending
      setHistory((prev) => [
        { command: text, featureName: result?.featureName, status: 'pending', timestamp: Date.now() },
        ...prev,
      ]);
    } catch (err) {
      console.error('AI Command failed:', err);
      setIsLoading(false);
      setNotice({ type: 'error', text: `Failed to generate feature: ${err.message}` });
    }
  };

  // ── Approve (8C + 8D) ─────────────────────────────────────
  const handleApprove = (feat) => {
    setAppliedFeatures((prev) => {
      // Prevent duplicates by featureName
      if (prev.some((f) => f.featureName === feat.featureName)) return prev;
      return [...prev, { ...feat, appliedAt: Date.now() }];
    });
    setProposal(null);
    setHistory((prev) =>
      prev.map((h, i) =>
        i === 0 ? { ...h, status: 'approved' } : h
      )
    );
    setNotice({
      type: 'success',
      text: `✅ "${feat.featureName}" has been approved and added to your active features!`,
    });
    setTimeout(() => setNotice(null), 5000);
  };

  // ── Reject ────────────────────────────────────────────────
  const handleReject = () => {
    setHistory((prev) =>
      prev.map((h, i) =>
        i === 0 ? { ...h, status: 'rejected' } : h
      )
    );
    setProposal(null);
    setNotice({ type: 'error', text: '❌ Feature proposal rejected.' });
    setTimeout(() => setNotice(null), 3000);
  };

  // ── Remove applied feature ────────────────────────────────
  const handleRemoveFeature = (id) => {
    setAppliedFeatures((prev) => prev.filter((f) => f.id !== id));
  };

  const tabs = [
    { id: 'command',  label: '⌨️ Command',  badge: proposal ? '1' : null },
    { id: 'features', label: '📦 Active Features', badge: appliedFeatures.length > 0 ? String(appliedFeatures.length) : null },
    { id: 'errors',   label: '🚨 Error Monitor',   badge: errors.length > 0 ? String(errors.length) : null },
  ];

  return (
    <div className="page-container fade-in">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">🤖 AI Command Center</h1>
        <p className="page-subtitle">
          Give natural-language commands · AI generates features · You approve the changes
        </p>
      </div>

      {/* ── How it works banner ──────────────────────────── */}
      <div style={{
        display: 'flex', gap: '0', marginBottom: '28px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
      }}>
        {[
          { step: '1', icon: '⌨️', title: 'Type a Command', desc: 'Describe what you want' },
          { step: '2', icon: '🧠', title: 'AI Interprets', desc: 'Generates a feature plan' },
          { step: '3', icon: '✅', title: 'You Approve',   desc: 'Review & apply safely'  },
          { step: '4', icon: '🚀', title: 'App Evolves',   desc: 'Feature goes live'       },
        ].map((s, i, arr) => (
          <div key={s.step} style={{
            flex: 1, padding: '16px', textAlign: 'center',
            borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
              {s.title}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Notice ───────────────────────────────────────── */}
      {notice && (
        <div
          className={`alert ${notice.type === 'success' ? 'alert-success' : 'alert-error'} fade-in`}
          style={{ marginBottom: '16px' }}
        >
          {notice.text}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
        padding: '4px', border: '1px solid var(--border)',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '6px', border: 'none',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '600',
              transition: 'all 0.2s',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))'
                : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            {tab.label}
            {tab.badge && (
              <span style={{
                background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--accent-blue)',
                color: 'white', fontSize: '10px', padding: '1px 6px',
                borderRadius: '10px', fontWeight: '800',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ TAB: COMMAND ════════════════════════════════════ */}
      {activeTab === 'command' && (
        <div>
          {/* Command input (8A) */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-title">⌨️ Enter AI Command</div>
            <div className="card-subtitle" style={{ marginBottom: '14px' }}>
              Describe a feature or improvement in plain English
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input
                ref={inputRef}
                className="form-input"
                placeholder='e.g. "Add weekly mock test tracker" or "Improve planner logic"'
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSubmit()}
                disabled={isLoading}
                style={{ flex: 1, fontSize: '14px' }}
                id="aiCommandInput"
              />
              <button
                className="btn btn-primary"
                onClick={() => handleSubmit()}
                disabled={isLoading || !command.trim()}
                style={{ whiteSpace: 'nowrap', minWidth: '120px' }}
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ animation: 'pulse-glow 1s ease infinite', display: 'inline-block' }}>⚙️</span>
                    Thinking…
                  </span>
                ) : '🚀 Generate'}
              </button>
            </div>

            {/* Suggestion chips */}
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                QUICK SUGGESTIONS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSubmit(s)}
                    disabled={isLoading}
                    style={{
                      background: 'var(--bg-primary)', border: '1px solid var(--border)',
                      borderRadius: '20px', padding: '5px 12px', fontSize: '12px',
                      color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = 'var(--accent-blue)';
                      e.target.style.color = 'var(--accent-blue-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = 'var(--border)';
                      e.target.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="card fade-in" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🧠</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                AI is interpreting your command…
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Analysing requirements · Generating feature plan · Estimating complexity
              </div>
            </div>
          )}

          {/* Feature proposal (8C) */}
          {!isLoading && proposal && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600' }}>
                GENERATED FEATURE PROPOSAL — Review and approve or reject below
              </div>
              <FeatureProposal
                proposal={proposal}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>
          )}

          {/* Command history */}
          {history.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div className="section-header" style={{ marginBottom: '10px' }}>
                <div className="section-title">📜 Command History</div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem(COMMAND_HISTORY_KEY);
                  }}
                >
                  🗑️ Clear
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {history.slice(0, 15).map((item, i) => (
                  <HistoryItem key={i} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: ACTIVE FEATURES (8D) ════════════════════════ */}
      {activeTab === 'features' && (
        <div>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div className="section-title">
              📦 Active Features
              <span style={{
                background: 'var(--accent-blue)', color: 'white',
                fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: '700',
              }}>
                {appliedFeatures.length}
              </span>
            </div>
          </div>

          {appliedFeatures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No features applied yet</div>
              <div className="empty-state-desc">
                Go to the Command tab, generate a feature, and approve it.
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
                onClick={() => setActiveTab('command')}
              >
                → Go to Command
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {appliedFeatures.map((feat) => (
                <AppliedFeatureCard key={feat.id} feat={feat} onRemove={handleRemoveFeature} />
              ))}

              {/* Summary chip */}
              <div style={{
                marginTop: '8px', padding: '14px', background: 'rgba(16,185,129,0.07)',
                border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)',
                fontSize: '13px', color: 'var(--accent-green)',
              }}>
                <strong>{appliedFeatures.length} feature{appliedFeatures.length !== 1 ? 's' : ''}</strong> approved and registered.
                These are visible on the <strong>Dashboard → AI Features</strong> section.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: ERROR MONITOR (8E) ══════════════════════════ */}
      {activeTab === 'errors' && (
        <div>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div className="section-title">🚨 Runtime Error Monitor</div>
          </div>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '16px',
            fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6',
          }}>
            <strong style={{ color: 'var(--text-secondary)' }}>How it works:</strong>{' '}
            The monitor hooks into <code style={{ color: 'var(--accent-cyan)' }}>window.onerror</code> to catch
            uncaught JavaScript errors. When an error occurs, the AI engine analyses the message
            and provides a fix suggestion.
          </div>

          {/* Manual error tester */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-title" style={{ marginBottom: '10px' }}>🧪 Test Error Analyser</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                id="errorTestInput"
                placeholder='Paste an error message, e.g. "TypeError: Cannot read properties of undefined"'
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const raw = e.target.value.trim();
                    if (!raw) return;
                    e.target.value = 'Analysing...';
                    try {
                      const fix = await analyzeError(raw);
                      setErrors((prev) => {
                        if (prev.some((er) => er.fix.issue === fix.issue)) return prev;
                        return [{ raw, fix }, ...prev];
                      });
                    } catch (err) {
                      console.error('Manual error analysis failed:', err);
                    }
                    e.target.value = '';
                  }
                }}
              />
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  const input = document.getElementById('errorTestInput');
                  const raw = input?.value.trim();
                  if (!raw || raw === 'Analysing...') return;
                  input.value = 'Analysing...';
                  try {
                    const fix = await analyzeError(raw);
                    setErrors((prev) => {
                      if (prev.some((er) => er.fix.issue === fix.issue)) return prev;
                      return [{ raw, fix }, ...prev];
                    });
                  } catch (err) {
                    console.error('Manual error analysis failed:', err);
                  }
                  if (input) input.value = '';
                }}
              >
                Analyse
              </button>
            </div>
          </div>

          <ErrorMonitor errors={errors} onClear={() => setErrors([])} />
        </div>
      )}
    </div>
  );
}

export default AICommand;
