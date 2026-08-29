'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'
import Character from '../components/Character'

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
  const [postsBySession, setPostsBySession] = useState({})
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [distractions, setDistractions] = useState(0)
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [justFinished, setJustFinished] = useState(null)
  const [expandedSession, setExpandedSession] = useState(null)
  const intervalRef = useRef(null)
  const wasHiddenRef = useRef(false)

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
        .select('*, avatarInfo:avatars(color, color2, species)')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      await loadSessions(user.id)
      setLoading(false)
    }
    load()
  }, [])

  async function loadSessions(userId) {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    setSessions(sessionData || [])

    if (sessionData && sessionData.length > 0) {
      const sessionIds = sessionData.map(s => s.id)
      const { data: postsData } = await supabase
        .from('activity_posts')
        .select('id, session_id, is_private')
        .in('session_id', sessionIds)
        .eq('user_id', userId)

      const map = {}
      ;(postsData || []).forEach((p) => { map[p.session_id] = p })

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id)
        const { data: kudosData } = await supabase.from('kudos').select('post_id').in('post_id', postIds)
        const { data: commentsData } = await supabase.from('comments').select('post_id').in('post_id', postIds)

        ;(postsData || []).forEach((p) => {
          map[p.session_id].kudosCount = (kudosData || []).filter(k => k.post_id === p.id).length
          map[p.session_id].commentsCount = (commentsData || []).filter(c => c.post_id === p.id).length
        })
      }

      setPostsBySession(map)
    }
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

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

    const { data: newSession } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        label: label.trim() || 'focus session',
        minutes,
        xp_earned: earnedXp,
        distractions,
      })
      .select()
      .single()

    const { data: newPost } = await supabase
      .from('activity_posts')
      .insert({ session_id: newSession.id, user_id: user.id, is_private: true })
      .select()
      .single()

    const newXp = (profile.xp || 0) + earnedXp
    await supabase.from('profiles').update({ xp: newXp }).eq('id', user.id)
    setProfile({ ...profile, xp: newXp })

    await loadSessions(user.id)

    setJustFinished({ ...newSession, postId: newPost.id })
    setSeconds(0)
    setDistractions(0)
    setLabel('')
  }

  async function shareSession() {
    if (!justFinished) return
    await supabase.from('activity_posts').update({ is_private: false }).eq('id', justFinished.postId)
    setJustFinished(null)
    await loadSessions(user.id)
  }

  function dismissShare() {
    setJustFinished(null)
  }

  async function togglePostPrivacy(sessionId) {
    const post = postsBySession[sessionId]
    if (!post) return
    await supabase.from('activity_posts').update({ is_private: !post.is_private }).eq('id', post.id)
    await loadSessions(user.id)
  }

  async function removeFromFeed(sessionId) {
    const post = postsBySession[sessionId]
    if (!post) return
    const confirmed = window.confirm('Remove this from the feed? Your session and XP stay intact.')
    if (!confirmed) return
    await supabase.from('activity_posts').delete().eq('id', post.id)
    await loadSessions(user.id)
  }

  async function deleteSession(sessionId, xpEarned) {
    const confirmed = window.confirm('Delete this session? This will also remove its XP and any feed post.')
    if (!confirmed) return

    await supabase.from('sessions').delete().eq('id', sessionId)

    const newXp = Math.max((profile.xp || 0) - xpEarned, 0)
    await supabase.from('profiles').update({ xp: newXp }).eq('id', user.id)
    setProfile({ ...profile, xp: newXp })

    await loadSessions(user.id)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {profile?.avatarInfo && (
            <Character
              color={profile.avatarInfo.color}
              color2={profile.avatarInfo.color2}
              species={profile.avatarInfo.species}
              size={48}
              celebrate={!!justFinished}
            />
          )}
          <h1 className="gradient-text" style={{ fontSize: 32 }}>Hey, {profile?.username}</h1>
        </div>
        <button onClick={handleLogout}>Log out</button>
      </div>

      <Nav />

      {justFinished && (() => {
        const baseXp = justFinished.minutes
        const penalty = Math.max(baseXp - justFinished.xp_earned, 0)
        const hadPenalty = justFinished.distractions > 0 && penalty > 0

        return (
          <div className="glass-card" style={{
            marginTop: 20,
            textAlign: 'center',
            borderColor: 'var(--accent)',
            boxShadow: '0 0 32px rgba(124, 92, 255, 0.3)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🎉</div>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', marginBottom: 10 }}>Nice work!</h3>

            <div className="mono" style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'left', maxWidth: 220, margin: '0 auto 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Focused time</span>
                <span>{justFinished.minutes}m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Base XP</span>
                <span>{baseXp}</span>
              </div>
              {hadPenalty && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                  <span>Left tab {justFinished.distractions}x</span>
                  <span>-{penalty}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 4, marginTop: 2, color: 'var(--accent)', fontWeight: 700 }}>
                <span>Total XP</span>
                <span>+{justFinished.xp_earned}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={shareSession}>Share to feed</button>
              <button onClick={dismissShare} className="icon-button">Keep private</button>
            </div>
          </div>
        )
      })()}

      <div className="mono" style={{ margin: '20px 0', fontSize: 14, color: 'var(--text-muted)' }}>
        XP: <b style={{ color: 'var(--accent)' }}>{profile?.xp}</b> &nbsp; Streak: <b style={{ color: 'var(--accent)' }}>{profile?.streak}</b>
      </div>

      <div className="glass-card" style={{ textAlign: 'center' }}>
        {!running && (
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="what are you working on?"
            style={{ width: '100%', marginBottom: 16 }}
          />
        )}
        <div className="mono" style={{ fontSize: 48, fontWeight: 700 }}>{fmtTime(seconds)}</div>
        {running && distractions > 0 && (
          <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>left the tab {distractions}x</div>
        )}
        <div style={{ marginTop: 16 }}>
          {!running ? (
            <button onClick={startSession} style={{ padding: '10px 24px' }}>Start session</button>
          ) : (
            <button onClick={endSession} style={{ padding: '10px 24px' }}>End session</button>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: 16 }}>
        <h4 style={{ marginBottom: 12 }}>Recent sessions</h4>
        {sessions.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No sessions yet</p>}
        {sessions.map((s) => {
          const post = postsBySession[s.id]
          const isExpanded = expandedSession === s.id

          return (
            <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {s.label}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(s.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <span className="mono" style={{ color: 'var(--text-muted)' }}>{s.minutes}m</span>
                <span className="mono" style={{ color: 'var(--accent)' }}>+{s.xp_earned} xp</span>
                <button
                  onClick={() => deleteSession(s.id, s.xp_earned)}
                  className="icon-button"
                  style={{ fontSize: 10, padding: '2px 8px', marginLeft: 8 }}
                >
                  ×
                </button>
              </div>

              {isExpanded && post && (
                <div style={{ marginTop: 8, paddingLeft: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: 6 }}>
                    {post.is_private ? '🔒 Private — only you can see this' : `🌍 Public — ${post.kudosCount || 0} kudos, ${post.commentsCount || 0} comments`}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => togglePostPrivacy(s.id)} className="icon-button" style={{ fontSize: 11, padding: '4px 10px' }}>
                      {post.is_private ? 'Make public' : 'Make private'}
                    </button>
                    {!post.is_private && (
                      <button onClick={() => removeFromFeed(s.id)} className="icon-button" style={{ fontSize: 11, padding: '4px 10px' }}>
                        Remove from feed
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}