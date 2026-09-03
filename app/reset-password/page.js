'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function checkPasswordStrength(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include a number.'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must include a special character.'
  return null
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    const strengthError = checkPasswordStrength(password)
    if (strengthError) {
      setMessage(strengthError)
      return
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Password updated! Redirecting...')
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  return (
    <div className="page-fade" style={{ maxWidth: 400, margin: '60px auto', padding: '0 20px' }}>
      <div className="glass-card">
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', marginBottom: 20 }}>Set a new password</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit">Update password</button>
        </form>
        {message && <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>{message}</p>}
      </div>
    </div>
  )
}