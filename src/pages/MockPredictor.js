import React, { useState } from 'react';

// ── Score Predictor Logic ──────────────────────────────────
function predictScore({ hoursPerDay, weakCount, avgFocus, daysLeft }) {
  // Simple heuristic model
  let base = 40;
  base += Math.min(hoursPerDay * 4, 20);    // more hours → higher score
  base += Math.min((avgFocus / 5) * 15, 15); // better focus → higher score
  base -= Math.min(weakCount * 5, 20);       // weak subjects pull down score
  base += Math.min(Math.sqrt(daysLeft) * 1.2, 15); // more time left → higher potential

  return Math.max(10, Math.min(100, Math.round(base)));
}

function scoreToRank(score) {
  if (score >= 80) return { rank: 'Top 100',   color: '#10b981', label: '🏆 Excellent' };
  if (score >= 65) return { rank: 'Top 500',   color: '#3b82f6', label: '⭐ Good' };
  if (score >= 50) return { rank: 'Top 2000',  color: '#f59e0b', label: '📈 Average' };
  if (score >= 35) return { rank: 'Top 5000',  color: '#f97316', label: '⚠️ Needs Work' };
  return { rank: 'Top 10000+', color: '#ef4444', label: '🚨 Critical' };
}

// ── Gauge Component ────────────────────────────────────────
function ScoreGauge({ score }) {
  const radius = 80;
  const stroke = 12;
  const normalizedR = radius - stroke / 2;
  const circ = 2 * Math.PI * normalizedR;
  // Half-circle: 0..score mapped to top half
  const halfCirc = circ / 2;
  const offset = halfCirc - (score / 100) * halfCirc;

  const { rank, color, label } = scoreToRank(score);

  return (
    <div style={{ textAlign: 'center', padding: '16px' }}>
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Background arc */}
        <path
          d={`M ${stroke / 2 + 10} 100 A ${normalizedR} ${normalizedR} 0 0 1 ${200 - stroke / 2 - 10} 100`}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={`M ${stroke / 2 + 10} 100 A ${normalizedR} ${normalizedR} 0 0 1 ${200 - stroke / 2 - 10} 100`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={halfCirc * 1.02}
          strokeDashoffset={(1 - score / 100) * halfCirc * 1.02}
          style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        {/* Score text */}
        <text x="100" y="92" textAnchor="middle" fill="var(--text-primary)" fontSize="32" fontWeight="800">
          {score}
        </text>
        <text x="100" y="112" textAnchor="middle" fill="var(--text-muted)" fontSize="11">
          / 100
        </text>
      </svg>
      <div style={{ fontSize: '18px', fontWeight: '700', color, marginTop: '-8px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
        Predicted Rank: <strong style={{ color }}>{rank}</strong>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
function MockPredictor({ subjects, logs }) {
  const weakCount = new Set(
    logs.filter((l) => l.difficulty === 'Hard').map((l) => l.subjectName).filter(Boolean)
  ).size;

  const avgFocus =
    logs.length > 0
      ? logs.reduce((sum, l) => sum + Number(l.focusLevel || 0), 0) / logs.length
      : 3;

  const [form, setForm] = useState({
    hoursPerDay: '5',
    daysLeft: '200',
    weakCount: String(weakCount),
    avgFocus: avgFocus.toFixed(1),
  });

  const [result, setResult] = useState(null);
  const [tips, setTips] = useState([]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePredict = () => {
    const score = predictScore({
      hoursPerDay: Number(form.hoursPerDay),
      weakCount: Number(form.weakCount),
      avgFocus: Number(form.avgFocus),
      daysLeft: Number(form.daysLeft),
    });
    setResult(score);

    const newTips = [];
    if (Number(form.hoursPerDay) < 4)
      newTips.push('📚 Try studying at least 5–6 hours per day for GATE.');
    if (Number(form.avgFocus) < 3)
      newTips.push('🧘 Improve your focus with Pomodoro technique or meditation.');
    if (Number(form.weakCount) > 2)
      newTips.push('📌 You have many weak subjects. Schedule dedicated revision blocks.');
    if (Number(form.daysLeft) < 60)
      newTips.push('⏳ Less than 60 days left! Focus on PYQs and revision, not new topics.');
    if (score >= 70)
      newTips.push('🎯 You\'re on track for a good rank. Maintain consistency!');
    if (newTips.length === 0)
      newTips.push('✅ Inputs look balanced. Keep your current schedule!');

    setTips(newTips);
  };

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">🎯 Mock Predictor</h1>
        <p className="page-subtitle">
          Estimate your GATE score and rank based on your current study metrics
        </p>
      </div>

      <div className="card-grid-2" style={{ marginBottom: '24px' }}>
        {/* Inputs */}
        <div className="card">
          <div className="card-title">⚙️ Your Study Parameters</div>
          <div className="card-subtitle">Fill in your current metrics to get a prediction</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="hoursPerDay">
                Daily Study Hours — <strong style={{ color: 'var(--accent-blue-light)' }}>{form.hoursPerDay}h</strong>
              </label>
              <input
                id="hoursPerDay"
                name="hoursPerDay"
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={form.hoursPerDay}
                onChange={handleChange}
                style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>1h</span><span>12h</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="daysLeft">
                Days Until GATE — <strong style={{ color: 'var(--accent-blue-light)' }}>{form.daysLeft} days</strong>
              </label>
              <input
                id="daysLeft"
                name="daysLeft"
                type="range"
                min="10"
                max="365"
                step="5"
                value={form.daysLeft}
                onChange={handleChange}
                style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>10d</span><span>365d</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="weakCountInput">
                Weak Subjects — <strong style={{ color: 'var(--accent-red)' }}>{form.weakCount}</strong>
              </label>
              <input
                id="weakCountInput"
                name="weakCount"
                type="range"
                min="0"
                max={subjects.length || 10}
                step="1"
                value={form.weakCount}
                onChange={handleChange}
                style={{ width: '100%', accentColor: 'var(--accent-red)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>0</span><span>{subjects.length || 10}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="avgFocusInput">
                Avg. Focus Level — <strong style={{ color: 'var(--accent-orange)' }}>{Number(form.avgFocus).toFixed(1)}/5</strong>
              </label>
              <input
                id="avgFocusInput"
                name="avgFocus"
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={form.avgFocus}
                onChange={handleChange}
                style={{ width: '100%', accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>1</span><span>5</span>
              </div>
            </div>

            {logs.length > 0 && (
              <div className="insight-card insight-info">
                <span className="insight-icon">ℹ️</span>
                <div className="insight-text">
                  Focus & weak count are pre-filled from your <strong>{logs.length} daily logs</strong>.
                </div>
              </div>
            )}

            <button className="btn btn-primary btn-lg" onClick={handlePredict}>
              🔮 Predict My Score
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="card">
          <div className="card-title">📊 Prediction Result</div>
          <div className="card-subtitle">Based on your input parameters</div>

          {result === null ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div className="empty-state-title">No prediction yet</div>
              <div className="empty-state-desc">
                Fill in your parameters and click "Predict My Score"
              </div>
            </div>
          ) : (
            <div className="fade-in">
              <ScoreGauge score={result} />
              <hr className="divider" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  💡 Recommendations
                </div>
                {tips.map((tip, i) => (
                  <div key={i} className="insight-card insight-info" style={{ marginBottom: '8px' }}>
                    <div className="insight-text">{tip}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="insight-card insight-info">
        <span className="insight-icon">📌</span>
        <div className="insight-text">
          <strong>Disclaimer:</strong> This is a <em>heuristic estimator</em> based on simple rules — not
          a real ML model. Use it for motivation and trend tracking, not as an exact prediction.
        </div>
      </div>
    </div>
  );
}

export default MockPredictor;
