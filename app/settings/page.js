'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [currentUsername, setCurrentUsername] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      setCurrentUsername(profile?.username || '')
      setUsername(profile?.username || '')
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setMessage('')

    const trimmed = username.trim()

    if (trimmed.length < 3) {
      setMessage('Username must be at least 3 characters.')
      return
    }
    if (trimmed.length > 20) {
      setMessage('Username must be under 20 characters.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setMessage('Only letters, numbers, and underscores allowed.')
      return
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .neq('id', user.id)
      .maybeSingle()

    if (existing) {
      setMessage('That username is already taken.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', user.id)

    if (error) {
      setMessage('Something went wrong: ' + error.message)
    } else {
      setCurrentUsername(trimmed)
      setMessage('Username updated!')
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <h1 className="gradient-text" style={{ fontSize: 32, marginBottom: 20 }}>Settings</h1>

      <Nav />

      <div className="glass-card" style={{ marginTop: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Your current username: <b style={{ color: 'var(--text)' }}>{currentUsername}</b> — this is what friends search for to add you.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="new username"
          />
          <button type="submit">Save username</button>
        </form>

        {message && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>{message}</p>}
      </div>
    </div>
  )
}