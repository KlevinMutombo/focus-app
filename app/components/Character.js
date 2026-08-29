'use client'

export default function Character({ color = '#7C5CFF', color2 = '#5A3FD9', species = 'blob', size = 64, celebrate = false }) {
  const gradId = `grad-${color.replace('#', '')}-${species}`

  function renderFace() {
    switch (species) {
      case 'cat':
        return (
          <>
            <path d="M 25 30 L 35 15 L 42 32 Z" fill={`url(#${gradId})`} />
            <path d="M 75 30 L 65 15 L 58 32 Z" fill={`url(#${gradId})`} />
            <circle cx="50" cy="52" r="35" fill={`url(#${gradId})`} />
            <g style={{ animation: 'char-blink 3.5s ease-in-out infinite', transformOrigin: '50% 47%' }}>
              <circle cx="38" cy="47" r="5" fill="#1A1730" />
              <circle cx="62" cy="47" r="5" fill="#1A1730" />
            </g>
            <path d="M 46 58 L 50 62 L 54 58" stroke="#1A1730" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <line x1="20" y1="58" x2="35" y2="60" stroke="#1A1730" strokeWidth="1.5" />
            <line x1="20" y1="65" x2="35" y2="64" stroke="#1A1730" strokeWidth="1.5" />
            <line x1="80" y1="58" x2="65" y2="60" stroke="#1A1730" strokeWidth="1.5" />
            <line x1="80" y1="65" x2="65" y2="64" stroke="#1A1730" strokeWidth="1.5" />
          </>
        )
      case 'fox':
        return (
          <>
            <path d="M 22 28 L 38 12 L 40 34 Z" fill={`url(#${gradId})`} />
            <path d="M 78 28 L 62 12 L 60 34 Z" fill={`url(#${gradId})`} />
            <circle cx="50" cy="52" r="35" fill={`url(#${gradId})`} />
            <ellipse cx="50" cy="64" rx="16" ry="12" fill="rgba(255,255,255,0.5)" />
            <g style={{ animation: 'char-blink 3.5s ease-in-out infinite', transformOrigin: '50% 47%' }}>
              <ellipse cx="38" cy="46" rx="4" ry="5" fill="#1A1730" />
              <ellipse cx="62" cy="46" rx="4" ry="5" fill="#1A1730" />
            </g>
            <path d="M 47 58 L 50 62 L 53 58 Z" fill="#1A1730" />
          </>
        )
      case 'robot':
        return (
          <>
            <line x1="50" y1="8" x2="50" y2="18" stroke={color} strokeWidth="3" />
            <circle cx="50" cy="6" r="4" fill={color} />
            <rect x="16" y="20" width="68" height="62" rx="16" fill={`url(#${gradId})`} />
            <g style={{ animation: 'char-blink 3.5s ease-in-out infinite', transformOrigin: '50% 48%' }}>
              <rect x="30" y="42" width="12" height="10" rx="3" fill="#1A1730" />
              <rect x="58" y="42" width="12" height="10" rx="3" fill="#1A1730" />
            </g>
            <rect x="38" y="62" width="24" height="4" rx="2" fill="#1A1730" />
          </>
        )
      case 'hero':
        return (
          <>
            <path d="M 50 20 C 20 30, 20 65, 50 90 C 80 65, 80 30, 50 20 Z" fill="rgba(0,0,0,0.15)" transform="translate(0,4)" />
            <circle cx="50" cy="50" r="35" fill={`url(#${gradId})`} />
            <path d="M 20 44 Q 50 28 80 44 L 76 50 Q 50 38 24 50 Z" fill="#1A1730" opacity="0.8" />
            <g style={{ animation: 'char-blink 3.5s ease-in-out infinite', transformOrigin: '50% 50%' }}>
              <circle cx="38" cy="52" r="4.5" fill="#1A1730" />
              <circle cx="62" cy="52" r="4.5" fill="#1A1730" />
            </g>
            <path d="M 40 64 Q 50 70 60 64" stroke="#1A1730" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )
      default:
        return (
          <>
            <circle cx="50" cy="50" r="38" fill={`url(#${gradId})`} />
            <g style={{ animation: 'char-blink 3.5s ease-in-out infinite', transformOrigin: '50% 45%' }}>
              <circle cx="38" cy="45" r="5" fill="#1A1730" />
              <circle cx="62" cy="45" r="5" fill="#1A1730" />
            </g>
            <path d="M 38 62 Q 50 70 62 62" stroke="#1A1730" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <circle cx="30" cy="55" r="5" fill="rgba(255,255,255,0.35)" />
          </>
        )
    }
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
        animation: celebrate ? 'char-celebrate 0.6s ease' : 'char-idle 2.4s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes char-idle {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.02); }
        }
        @keyframes char-celebrate {
          0% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.25) rotate(-8deg); }
          60% { transform: scale(1.15) rotate(6deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes char-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.1); }
        }
      `}</style>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="92" rx="24" ry="4" fill="rgba(0,0,0,0.15)" />
        {renderFace()}
      </svg>
      {celebrate && (
        <div style={{ position: 'absolute', top: -10, right: -6, fontSize: size * 0.28 }}>✨</div>
      )}
    </div>
  )
}