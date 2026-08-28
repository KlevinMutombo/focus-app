'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function fmtTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sessions, setSessions] = useState([])
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [distractions, setDistractions] = useState(0)
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)
  const wasHiddenRef = useRef(false)

  // auth check + load data
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setSessions(sessionData || [])

      setLoading(false)
    }
    load()
  }, [])

  // timer tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  // distraction detection
  useEffect(() => {
    function handleVisibility() {
      if (running && document.hidden) {
        wasHiddenRef.current = true
      } else if (running && !document.hidden && wasHiddenRef.current) {
        setDistractions((d) => d + 1)
        wasHiddenRef.current = false
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [running])

  function startSession() {
    setSeconds(0)
    setDistractions(0)
    setRunning(true)
  }

  async function endSession() {
    setRunning(false)
    const minutes = Math.floor(seconds / 60)
    if (minutes < 1) return

    const distractionPenalty = Math.min(distractions * 2, minutes)
    const earnedXp = Math.max(minutes - distractionPenalty, Math.floor(minutes * 0.2))

    await supabase.from('sessions').insert({
      user_id: user.id,
      label: label.trim() || 'focus session',
      minutes,
      xp_earned: earnedXp,
      distractions,
    })

    const newXp = (profile.xp || 0) + earnedXp
    await supabase
      .from('profiles')
      .update({ xp: newXp })
      .eq('id', user.id)

    setProfile({ ...profile, xp: newXp })

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setSessions(sessionData || [])

    setSeconds(0)
    setDistractions(0)
    setLabel('')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', fontFamily: 'sans-serif', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Hey, {profile?.username}</h2>
        <button onClick={handleLogout} style={{ fontSize: 12 }}>Log out</button>
      </div>

      <div style={{ margin: '20px 0', fontSize: 14 }}>
        XP: <b>{profile?.xp}</b> &nbsp; Streak: <b>{profile?.streak}</b>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, textAlign: 'center' }}>
        {!running && (
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="what are you working on?"
            style={{ width: '100%', padding: 8, marginBottom: 16, boxSizing: 'border-box' }}
          />
        )}
        <div style={{ fontSize: 48, fontWeight: 700 }}>{fmtTime(seconds)}</div>
        {running && distractions > 0 && (
          <div style={{ fontSize: 12, color: 'red' }}>left the tab {distractions}x</div>
        )}
        <div style={{ marginTop: 16 }}>
          {!running ? (
            <button onClick={startSession} style={{ padding: '10px 24px' }}>Start session</button>
          ) : (
            <button onClick={endSession} style={{ padding: '10px 24px' }}>End session</button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h4>Recent sessions</h4>
        {sessions.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>No sessions yet</p>}
        {sessions.map((s) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <span>{s.label}</span>
            <span>{s.minutes}m</span>
            <span>+{s.xp_earned} xp</span>
          </div>
        ))}
      </div>
    </div>
  )
}