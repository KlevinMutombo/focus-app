'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase'

function ConfirmInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('idle')

  async function handleConfirm() {
    setStatus('loading')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (!tokenHash || !type) {
      setStatus('failed')
      return
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (error) {
      setStatus('failed')
    } else {
      setStatus('confirmed')
    }
  }

  return (
    <div className="page-fade" style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        {status === 'idle' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>Confirm Your Email</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              Tap below to finish setting up your account.
            </p>
            <button onClick={handleConfirm} style={{ padding: '10px 24px' }}>
              Confirm My Email
            </button>
          </>
        )}

        {status === 'loading' && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Confirming...</p>
        )}

        {status === 'confirmed' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>Email Confirmed 🎉</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              You're all set. If you started signing up on this same device, you can go back to that tab and it'll continue automatically. Otherwise, you can close this tab and log in directly.
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>Something Went Wrong</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              This link may have expired. Try logging in directly — your account may already be confirmed, or request a new confirmation email.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
      <ConfirmInner />
    </Suspense>
  )
}