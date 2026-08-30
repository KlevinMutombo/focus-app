'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'
import Character from '../components/Character'

export default function FriendsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [myAvatar, setMyAvatar] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [pending, setPending] = useState([])
  const [sentPendingIds, setSentPendingIds] = useState([])
  const [friendIds, setFriendIds] = useState([])
  const [friendshipMap, setFriendshipMap] = useState({})
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
      const { data: myProfile } = await supabase.from('profiles').select('avatars(color, color2, species)').eq('id', user.id).single()
      setMyAvatar(myProfile?.avatars)
      await loadPending(user.id)
      await loadSentPending(user.id)
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

  async function loadSentPending(userId) {
    const { data } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'pending')
    setSentPendingIds((data || []).map(f => f.friend_id))
  }

  async function loadFriends(userId) {
    const { data: sent } = await supabase
      .from('friendships')
      .select('id, friend_id, profiles!friendships_friend_id_fkey(id, username, xp, avatars(color, color2, species))')
      .eq('user_id', userId)
      .eq('status', 'accepted')

    const { data: received } = await supabase
      .from('friendships')
      .select('id, user_id, profiles!friendships_user_id_fkey(id, username, xp, avatars(color, color2, species))')
      .eq('friend_id', userId)
      .eq('status', 'accepted')

    const combined = [
      ...(sent || []).map(f => ({ id: f.profiles.id, username: f.profiles.username, xp: f.profiles.xp, avatars: f.profiles.avatars })),
      ...(received || []).map(f => ({ id: f.profiles.id, username: f.profiles.username, xp: f.profiles.xp, avatars: f.profiles.avatars })),
    ]
    setFriends(combined)
    setFriendIds(combined.map(f => f.id))

    const fMap = {}
    ;(sent || []).forEach((f) => { fMap[f.profiles.id] = f.id })
    ;(received || []).forEach((f) => { fMap[f.profiles.id] = f.id })
    setFriendshipMap(fMap)
  }

  async function buildLeaderboard() {
    if (!user) return

    const allPeople = [{ id: user.id, username: 'You', xp: 0, avatars: myAvatar }, ...friends]

    if (period === 'all') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, xp, avatars(color, color2, species)')
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
    setSentPendingIds((prev) => [...prev, friendId])
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

  async function removeFriend(friendUserId) {
    const friendshipId = friendshipMap[friendUserId]
    if (!friendshipId) return
    const confirmed = window.confirm('Remove this friend?')
    if (!confirmed) return
    await supabase.from('friendships').delete().eq('id', friendshipId)
    await loadFriends(user.id)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Friends</h1>

      <Nav />

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="search by username"
            style={{ flex: 1 }}
          />
          <button onClick={handleSearch}>Search</button>
        </div>

        {searchResults.map((r) => {
          const alreadyFriend = friendIds.includes(r.id)
          const alreadyPending = sentPendingIds.includes(r.id)

          return (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <a href={`/profile/${r.username}`}>{r.username}</a>
              {alreadyFriend ? (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Friends</span>
              ) : alreadyPending ? (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending</span>
              ) : (
                <button onClick={() => sendRequest(r.id)} style={{ padding: '4px 10px', fontSize: 12 }}>Add</button>
              )}
            </div>
          )
        })}
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 16, marginBottom: 12 }}>Pending requests</h4>
          {pending.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <a href={`/profile/${p.profiles.username}`}>{p.profiles.username}</a>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => acceptRequest(p.id)} style={{ padding: '4px 10px', fontSize: 12 }}>Accept</button>
                <button onClick={() => declineRequest(p.id)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: 16 }}>Leaderboard</h4>
          <div style={{ display: 'flex', gap: 4 }}>
            {['daily', 'weekly', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={period === p ? '' : 'btn-secondary'}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                {p === 'all' ? 'All-time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {leaderboard.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No friends yet — search above to add some</p>}
        {leaderboard.map((f, i) => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono" style={{ color: 'var(--text-muted)', width: 20 }}>#{i + 1}</span>
              {f.avatars && <Character color={f.avatars.color} color2={f.avatars.color2} species={f.avatars.species} size={24} />}
              {f.username === 'You' ? (
                <span>{f.username}</span>
              ) : (
                <a href={`/profile/${f.username}`}>{f.username}</a>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--accent)' }}>{f.xp} xp</span>
              {f.username !== 'You' && (
                <button onClick={() => removeFriend(f.id)} className="btn-secondary" style={{ fontSize: 10, padding: '2px 8px' }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}