'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'

export default function Nav() {
  const supabase = createClient()
  const [username, setUsername] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      setUsername(profile?.username)

      const { count } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending')
      setPendingCount(count || 0)
    }
    load()
  }, [])

  return (
    <div className="card" style={{
      display: 'flex',
      gap: 20,
      padding: '12px 18px',
      marginBottom: 28,
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      <a id="tour-dashboard" href="/dashboard">Dashboard</a>
      <a id="tour-friends" href="/friends" style={{ position: 'relative' }}>
        Friends
        {pendingCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -6,
            right: -14,
            background: 'var(--danger)',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            borderRadius: '50%',
            width: 14,
            height: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {pendingCount}
          </span>
        )}
      </a>
      <a id="tour-feed" href="/feed">Feed</a>
      <a id="tour-planner" href="/planner">Planner</a>
      <a id="tour-calendar" href="/calendar">Calendar</a>
      <a id="tour-avatar" href="/avatar">Avatar</a>
      <a id="tour-shop" href="/shop">Shop</a>
      {username && <a id="tour-profile" href={`/profile/${username}`}>Profile</a>}
      <a id="tour-settings" href="/settings">Settings</a>
    </div>
  )
}