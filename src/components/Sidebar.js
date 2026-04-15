import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_MAIN = [
  { path: '/',           label: 'Dashboard',     icon: '🏠' },
  { path: '/planner',    label: 'Planner',        icon: '📚' },
  { path: '/predictor',  label: 'Mock Predictor', icon: '🎯' },
  { path: '/daily-log',  label: 'Daily Log',      icon: '📝' },
];

const NAV_AI = [
  { path: '/ai-command', label: 'AI Command',     icon: '🤖' },
];

function Sidebar({ appliedFeaturesCount = 0 }) {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  return (
    <aside className="sidebar">
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🧠</div>
          <div>
            <div className="sidebar-logo-text">AI Study OS</div>
            <div className="sidebar-logo-sub">GATE + College Planner</div>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="sidebar-nav">
        {/* Main pages */}
        <div className="nav-section-label">Menu</div>
        {NAV_MAIN.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {/* AI section */}
        <div className="nav-section-label" style={{ marginTop: '8px' }}>AI Features</div>
        {NAV_AI.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={{ position: 'relative' }}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {/* Badge showing active feature count */}
            {appliedFeaturesCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                color: 'white', fontSize: '10px', fontWeight: '800',
                padding: '1px 7px', borderRadius: '12px', flexShrink: 0,
              }}>
                {appliedFeaturesCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="sidebar-footer">
        <div className="sidebar-badge">
          <div className="sidebar-badge-title">📅 Today</div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>{dateStr}</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
