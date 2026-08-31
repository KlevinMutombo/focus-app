'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import Loading from '../../components/Loading'

export default function OnboardingUsernamePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null)
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

      const { data: profile } = await supabase.from('profiles').select('username_chosen').eq('id', user.id).single()
      if (profile?.username_chosen) {
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (username.trim().length < 3) {
      setUsernameStatus(null)
      return
    }
    const timeout = setTimeout(async () => {
      const trimmed = username.trim()
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        setUsernameStatus('invalid')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', trimmed)
        .neq('id', user?.id || '')
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
    return () => clearTimeout(timeout)
  }, [username, user])

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    const trimmed = username.trim()
    if (trimmed.length < 3 || trimmed.length > 20) {
      setMessage('Username must be 3-20 characters.')
      return
    }
    if (usernameStatus === 'taken') {
      setMessage('That username is already taken.')
      return
    }
    if (usernameStatus === 'invalid') {
      setMessage('Only letters, numbers, and underscores allowed.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed, username_chosen: true })
      .eq('id', user.id)

    if (error) {
      setMessage('Something went wrong: ' + error.message)
    } else {
      router.push('/onboarding/avatar')
    }
  }

  if (loading) return <Loading />

  return (
    <div className="page-fade" style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px' }}>
      <div className="card">
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Pick a username</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          This is what friends will search for to add you.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
            />
            {usernameStatus === 'available' && (
              <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ Available</div>
            )}
            {usernameStatus === 'taken' && (
              <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>Already taken</div>
            )}
            {usernameStatus === 'invalid' && (
              <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>Letters, numbers, underscores only</div>
            )}
          </div>
          <button type="submit">Continue</button>
        </form>

        {message && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>{message}</p>}
      </div>
    </div>
  )
}