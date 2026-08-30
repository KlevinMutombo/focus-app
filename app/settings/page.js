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

  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')

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

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPasswordMessage('')

    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage('Passwords do not match.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordMessage(error.message)
    } else {
      setPasswordMessage('Password updated successfully.')
      setNewPassword('')
      setConfirmNewPassword('')
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== currentUsername) {
      setDeleteMessage('Please type your username exactly to confirm.')
      return
    }

    const confirmed = window.confirm('This will permanently delete your account and all your data. This cannot be undone. Are you absolutely sure?')
    if (!confirmed) return

    setDeleting(true)
    setDeleteMessage('')

    const { data: { session } } = await supabase.auth.getSession()

    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const result = await res.json()

      if (!res.ok) {
        setDeleteMessage(result.error || 'Something went wrong.')
        setDeleting(false)
        return
      }

      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      setDeleteMessage('Something went wrong. Please try again.')
      setDeleting(false)
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Settings</h1>

      <Nav />

      <div className="card" style={{ marginTop: 20 }}>
        <h4 style={{ fontSize: 16, marginBottom: 12 }}>Username</h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Current: <b style={{ color: 'var(--text)' }}>{currentUsername}</b> — this is what friends search for to add you.
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

      <div className="card" style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 16, marginBottom: 12 }}>Password</h4>

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="new password"
          />
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="confirm new password"
          />
          <button type="submit">Update password</button>
        </form>

        {passwordMessage && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>{passwordMessage}</p>}
      </div>

      <div className="card" style={{ marginTop: 16, borderColor: 'var(--danger)' }}>
        <h4 style={{ fontSize: 16, marginBottom: 8, color: 'var(--danger)' }}>Delete account</h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          This permanently deletes your account, sessions, tasks, friendships, and all associated data. This cannot be undone.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Type your username (<b>{currentUsername}</b>) to confirm:
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={currentUsername}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            style={{ background: 'var(--danger)', color: '#fff', whiteSpace: 'nowrap' }}
          >
            {deleting ? 'Deleting...' : 'Delete my account'}
          </button>
        </div>
        {deleteMessage && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--danger)' }}>{deleteMessage}</p>}
      </div>
    </div>
  )
}