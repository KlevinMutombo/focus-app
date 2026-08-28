'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="icon-button"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        fontSize: 18,
        width: 44,
        height: 44,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}