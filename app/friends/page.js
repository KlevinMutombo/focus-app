'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function FriendsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [pending, setPending] = useState([])
  const [friends, setFriends] = useState([])
  const [period, setPeriod] = useState('all')
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadPending(user.id)
      await loadFriends(user.id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (user && friends.length >= 0) {
      buildLeaderboard()
    }
  }, [period, friends, user])

  async function loadPending(userId) {
    const { data } = await supabase
      .from('friendships')
      .select('id, user_id, profiles!friendships_user_id_fkey(username)')
      .eq('friend_id', userId)
      .eq('status', 'pending')
    setPending(data || [])
  }

  async function loadFriends(userId) {
    const { data: sent } = await supabase
      .from('friendships')
      .select('id, friend_id, profiles!friendships_friend_id_fkey(id, username, xp)')
      .eq('user_id', userId)
      .eq('status', 'accepted')

    const { data: received } = await supabase
      .from('friendships')
      .select('id, user_id, profiles!friendships_user_id_fkey(id, username, xp)')
      .eq('friend_id', userId)
      .eq('status', 'accepted')

    const combined = [
      ...(sent || []).map(f => ({ id: f.profiles.id, username: f.profiles.username, xp: f.profiles.xp })),
      ...(received || []).map(f => ({ id: f.profiles.id, username: f.profiles.username, xp: f.profiles.xp })),
    ]
    setFriends(combined)
  }

  async function buildLeaderboard() {
    if (!user) return

    const allPeople = [{ id: user.id, username: 'You', xp: 0 }, ...friends]

    if (period === 'all') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, xp')
        .in('id', allPeople.map(p => p.id))
      setLeaderboard((profiles || []).sort((a, b) => b.xp - a.xp))
      return
    }

    const now = new Date()
    const startDate = new Date()
    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0)
    } else if (period === 'weekly') {
      const day = now.getDay()
      startDate.setDate(now.getDate() - day)
      startDate.setHours(0, 0, 0, 0)
    }

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('user_id, xp_earned')
      .in('user_id', allPeople.map(p => p.id))
      .gte('created_at', startDate.toISOString())

    const xpByUser = {}
    ;(sessionsData || []).forEach((s) => {
      xpByUser[s.user_id] = (xpByUser[s.user_id] || 0) + s.xp_earned
    })

    const withPeriodXp = allPeople.map((p) => ({
      ...p,
      xp: xpByUser[p.id] || 0,
    }))

    setLeaderboard(withPeriodXp.sort((a, b) => b.xp - a.xp))
  }

  async function handleSearch() {
    if (!searchTerm.trim()) return
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${searchTerm}%`)
      .neq('id', user.id)
      .limit(5)
    setSearchResults(data || [])
  }

  async function sendRequest(friendId) {
    await supabase.from('friendships').insert({
      user_id: user.id,
      friend_id: friendId,
      status: 'pending',
    })
    setSearchResults([])
    setSearchTerm('')
  }

  async function acceptRequest(friendshipId) {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
    await loadPending(user.id)
    await loadFriends(user.id)
  }

  async function declineRequest(friendshipId) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    await loadPending(user.id)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <h1 className="gradient-text" style={{ fontSize: 32, marginBottom: 20 }}>Friends</h1>

      <Nav />

      <div className="glass-card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="search by username"
            style={{ flex: 1 }}
          />
          <button onClick={handleSearch}>Search</button>
        </div>

        {searchResults.map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
            <span>{r.username}</span>
            <button onClick={() => sendRequest(r.id)} style={{ padding: '4px 10px', fontSize: 12 }}>Add</button>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="glass-card" style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 12 }}>Pending requests</h4>
          {pending.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span>{p.profiles.username}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => acceptRequest(p.id)} style={{ padding: '4px 10px', fontSize: 12 }}>Accept</button>
                <button onClick={() => declineRequest(p.id)} className="icon-button" style={{ padding: '4px 10px', fontSize: 12 }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4>Leaderboard</h4>
          <div style={{ display: 'flex', gap: 4 }}>
            {['daily', 'weekly', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={period === p ? '' : 'icon-button'}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                {p === 'all' ? 'All-time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {leaderboard.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No friends yet — search above to add some</p>}
        {leaderboard.map((f, i) => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', fontSize: 13 }}>
            <span>#{i + 1} {f.username}</span>
            <span className="mono" style={{ color: 'var(--accent)' }}>{f.xp} xp</span>
          </div>
        ))}
      </div>
    </div>
  )
}