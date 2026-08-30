'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'

export default function EmailConfirmedPage() {
  const router = useRouter()
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
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              Your account is ready. Let's get you set up.
            </p>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 24px' }}>
              Continue
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              We couldn't confirm your email automatically. Try logging in directly — your account may already be confirmed.
            </p>
            <button onClick={() => router.push('/login?mode=login')} style={{ padding: '10px 24px' }}>
              Go to login
            </button>
          </>
        )}
      </div>
    </div>
  )
}