'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import Character from './Character'

const STEPS = [
  { target: '#tour-dashboard', title: 'Dashboard', text: "This is home base — start focus sessions, track your XP, and see recent activity." },
  { target: '#tour-planner', title: 'Planner', text: "Add tasks, break them into steps, and let urgency sort what to do next." },
  { target: '#tour-calendar', title: 'Calendar', text: "See everything due this month, and tap any day to add a task right there." },
  { target: '#tour-friends', title: 'Friends', text: "Add friends, see requests, and check the leaderboard — daily, weekly, or all-time." },
  { target: '#tour-feed', title: 'Feed', text: "Share sessions with friends, give boosts, and leave comments." },
  { target: '#tour-avatar', title: 'Avatar', text: "Pick your character and any accessories you've unlocked or bought." },
  { target: '#tour-shop', title: 'Shop', text: "Spend XP on accessories and premium avatars here." },
  { target: '#tour-settings', title: 'Settings', text: "Change your username, password, or delete your account here." },
]

export default function OnboardingTour({ avatarInfo }) {
  const supabase = createClient()
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('has_seen_tour').eq('id', user.id).single()
      if (!profile?.has_seen_tour) {
        setActive(true)
      }
    }
    check()
  }, [])

  useEffect(() => {
    if (!active) return
    function updateRect() {
      const el = document.querySelector(STEPS[step].target)
      if (el) setRect(el.getBoundingClientRect())
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [active, step])

  async function finishTour() {
    setActive(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ has_seen_tour: true }).eq('id', user.id)
    }
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      finishTour()
    }
  }

  if (!active || !rect) return null

  const current = STEPS[step]
  const tooltipTop = rect.bottom + 12
  const tooltipLeft = Math.min(Math.max(rect.left, 16), window.innerWidth - 300)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
      <svg width="100%" height="100%" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - 6}
              y={rect.top - 6}
              width={rect.width + 12}
              height={rect.height + 12}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(10,10,20,0.75)" mask="url(#tour-mask)" />
      </svg>

      <div
        style={{
          position: 'fixed',
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          border: '2px solid var(--accent)',
          borderRadius: 8,
          pointerEvents: 'none',
        }}
      />

      <div
        className="card-raised"
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          width: 280,
          padding: 16,
          borderColor: 'var(--accent)',
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {avatarInfo && (
            <Character color={avatarInfo.color} color2={avatarInfo.color2} species={avatarInfo.species} size={40} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{current.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>{current.text}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {step + 1} / {STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={finishTour} className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }}>
              Skip tour
            </button>
            <button onClick={next} style={{ fontSize: 12, padding: '5px 14px' }}>
              {step < STEPS.length - 1 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}