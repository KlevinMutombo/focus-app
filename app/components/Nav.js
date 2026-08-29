'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'

export default function Nav() {
  const supabase = createClient()
  const [username, setUsername] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      setUsername(profile?.username)
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
    }}>
      <a href="/dashboard">Dashboard</a>
      <a href="/friends">Friends</a>
      <a href="/feed">Feed</a>
      <a href="/planner">Planner</a>
      <a href="/calendar">Calendar</a>
      <a href="/avatar">Avatar</a>
      {username && <a href={`/profile/${username}`}>Profile</a>}
      <a href="/settings">Settings</a>
    </div>
  )
}