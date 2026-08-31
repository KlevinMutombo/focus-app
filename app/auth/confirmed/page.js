'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'

export default function EmailConfirmedPage() {
  const supabase = createClient()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setStatus('confirmed')
      } else {
        setStatus('failed')
      }
    }
    check()
  }, [])

  return (
    <div className="page-fade" style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        {status === 'checking' && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Confirming your email...</p>
        )}

        {status === 'confirmed' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>Email confirmed 🎉</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              You can close this tab and return to the page where you signed up — it'll pick up automatically.
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              We couldn't confirm your email automatically. Try logging in directly — your account may already be confirmed.
            </p>
          </>
        )}
      </div>
    </div>
  )
}