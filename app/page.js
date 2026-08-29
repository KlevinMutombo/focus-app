'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'
import Character from './components/Character'

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      setChecking(false)
    }
    check()
  }, [])

  if (checking) return <div style={{ padding: 40 }}>Loading...</div>

  const features = [
    { title: 'Focus sessions', desc: 'Start a timer, block distractions, earn XP for real focused time.', species: 'blob', color: '#7C5CFF', color2: '#5A3FD9' },
    { title: 'Smart planner', desc: 'Tasks sorted by urgency, broken into steps, always know what to do next.', species: 'fox', color: '#4DD8E8', color2: '#2BA8B8' },
    { title: 'Friends & leaderboards', desc: 'Compete daily, weekly, or all-time. Share sessions, give boosts.', species: 'cat', color: '#F5C518', color2: '#D9A400' },
    { title: 'Level up your avatar', desc: 'Earn characters as you build streaks and rack up XP.', species: 'hero', color: '#FF5C7A', color2: '#D63D5C' },
  ]

  return (
    <div className="page-fade" style={{ maxWidth: 680, margin: '0 auto', padding: '80px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <h1 style={{ fontSize: 52, marginBottom: 16, lineHeight: 1.1 }}>
          Momenta
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 32px' }}>
          Build momentum. Turn focused study time into XP, streaks, and friendly competition — with a planner that actually keeps up with your week.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => router.push('/login')} style={{ padding: '12px 28px', fontSize: 15 }}>
            Get started
          </button>
          <button onClick={() => router.push('/login?mode=login')} className="btn-secondary" style={{ padding: '12px 28px', fontSize: 15 }}>
            Log in
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {features.map((f) => (
          <div key={f.title} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Character color={f.color} color2={f.color2} species={f.species} size={44} />
            <div>
              <h4 style={{ fontSize: 15, marginBottom: 4 }}>{f.title}</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}