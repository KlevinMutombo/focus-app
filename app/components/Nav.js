'use client'

import { useTheme } from './ThemeProvider'

export default function Nav() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="glass-card" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 20px',
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <a href="/dashboard">Dashboard</a>
        <a href="/friends">Friends</a>
        <a href="/planner">Planner</a>
        <a href="/settings">Settings</a>
      </div>
      <button onClick={toggleTheme} className="icon-button" style={{ fontSize: 16, padding: '6px 10px' }}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  )
}