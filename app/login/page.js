'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Loading from '../components/Loading'

function checkPasswordStrength(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include a number.'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must include a special character.'
  return null
}

function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'login' ? 'login' : 'signup')
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null)
  const [message, setMessage] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [justSignedUpEmail, setJustSignedUpEmail] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  useEffect(() => {
    if (mode !== 'signup' || username.trim().length < 3) {
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
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
    return () => clearTimeout(timeout)
  }, [username, mode])

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    if (mode === 'signup') {
      const trimmedUsername = username.trim()
      if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        setMessage('Username must be 3-20 characters.')
        return
      }
      if (usernameStatus === 'taken') {
        setMessage('That username is already taken.')
        return
      }
      if (usernameStatus === 'invalid') {
        setMessage('Username can only contain letters, numbers, and underscores.')
        return
      }

      const strengthError = checkPasswordStrength(password)
      if (strengthError) {
        setMessage(strengthError)
        return
      }
      if (password !== confirmPassword) {
        setMessage('Passwords do not match.')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: trimmedUsername },
          emailRedirectTo: `${window.location.origin}/auth/confirmed`,
        },
      })

      if (error) {
        setMessage(error.message)
      } else if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setMessage('An account with this email already exists. Try logging in instead.')
      } else {
        setJustSignedUpEmail(email)
        setResendCooldown(60)
        setMessage("Check your email to confirm your account. If you're confirming on this device, this page updates automatically. If you confirm on another device (like your phone), just come back and log in.")

        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            router.push('/dashboard')
          }
        })
      }
    } else {
      const input = emailOrUsername.trim()
      let loginEmail = input

      if (!input.includes('@')) {
        const { data: resolvedEmail, error: lookupError } = await supabase.rpc('get_email_for_username', {
          input_username: input,
        })
        if (lookupError || !resolvedEmail) {
          setMessage('No account found with that username.')
          return
        }
        loginEmail = resolvedEmail
      }

      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) {
        setMessage(error.message)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profileData } = await supabase.from('profiles').select('avatar_id, username_chosen').eq('id', user.id).single()
        if (!profileData?.username_chosen) {
          router.push('/onboarding/username')
        } else if (!profileData?.avatar_id) {
          router.push('/onboarding/avatar')
        } else {
          router.push('/dashboard')
        }
      }
    }
  }

  async function handleResendConfirmation() {
    if (!justSignedUpEmail || resendCooldown > 0) return
    setMessage('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: justSignedUpEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    })
    if (error) {
      setMessage(error.message)
    } else {
      setResendCooldown(60)
      setMessage('Confirmation email resent — check your inbox.')
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setMessage('')
    if (!email) {
      setMessage('Enter your email above first.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Password reset email sent — check your inbox.')
    }
  }

  return (
    <div className="page-fade" style={{ maxWidth: 400, margin: '60px auto', padding: '0 20px' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: 20, fontSize: 13 }}>← Back to home</a>

      <div className="card">
        <h2 style={{ fontSize: 24, marginBottom: 20 }}>
          {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
        </h2>

        <button
          onClick={handleGoogleSignIn}
          className="btn-secondary"
          style={{ width: '100%', padding: '10px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          Continue With Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          OR
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {!forgotMode ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' ? (
              <>
                <div>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{ width: '100%' }}
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
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </>
            ) : (
              <input
                type="text"
                placeholder="Email Or Username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            )}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%' }}
            />
            {mode === 'signup' && (
              <>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.
                </p>
              </>
            )}
            <button type="submit" style={{ width: '100%' }}>
              {mode === 'signup' ? 'Sign Up' : 'Log In'}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="btn-secondary"
                style={{ fontSize: 12, border: 'none', background: 'none', padding: 0 }}
              >
                Forgot Password?
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
            />
            <button type="submit" style={{ width: '100%' }}>Send Reset Link</button>
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="btn-secondary"
              style={{ fontSize: 12, border: 'none', background: 'none', padding: 0 }}
            >
              Back To Login
            </button>
          </form>
        )}

        {message && <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>{message}</p>}

        {justSignedUpEmail && (
          <button
            onClick={handleResendConfirmation}
            disabled={resendCooldown > 0}
            className="btn-secondary"
            style={{ marginTop: 10, fontSize: 12, width: '100%' }}
          >
            {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Didn't receive it? Resend email"}
          </button>
        )}

        {!forgotMode && (
          <button
            onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage(''); setJustSignedUpEmail(null) }}
            className="btn-secondary"
            style={{ marginTop: 16, fontSize: 13, border: 'none', background: 'none', padding: 0, textDecoration: 'underline' }}
          >
            {mode === 'signup' ? 'Already Have An Account? Log In' : "Don't Have An Account? Sign Up"}
          </button>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  )
}