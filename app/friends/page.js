'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function FriendsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [pending, setPending] = useState([])
  const [friends, setFriends] = useState([])
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
      .select('id, friend_id, profiles!friendships_friend_id_fkey(username, xp)')
      .eq('user_id', userId)
      .eq('status', 'accepted')

    const { data: received } = await supabase
      .from('friendships')
      .select('id, user_id, profiles!friendships_user_id_fkey(username, xp)')
      .eq('friend_id', userId)
      .eq('status', 'accepted')

    const combined = [
      ...(sent || []).map(f => ({ id: f.id, username: f.profiles.username, xp: f.profiles.xp })),
      ...(received || []).map(f => ({ id: f.id, username: f.profiles.username, xp: f.profiles.xp })),
    ]
    setFriends(combined)
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

  const leaderboard = [...friends].sort((a, b) => b.xp - a.xp)

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', fontFamily: 'sans-serif', padding: 20 }}>
      <h2>Friends</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="search by username"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {searchResults.map((r) => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
          <span>{r.username}</span>
          <button onClick={() => sendRequest(r.id)}>Add</button>
        </div>
      ))}

      {pending.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>Pending requests</h4>
          {pending.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>{p.profiles.username}</span>
              <div>
                <button onClick={() => acceptRequest(p.id)}>Accept</button>
                <button onClick={() => declineRequest(p.id)} style={{ marginLeft: 8 }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h4>Leaderboard</h4>
        {leaderboard.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>No friends yet — search above to add some</p>}
        {leaderboard.map((f, i) => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <span>#{i + 1} {f.username}</span>
            <span>{f.xp} xp</span>
          </div>
        ))}
      </div>
    </div>
  )
}