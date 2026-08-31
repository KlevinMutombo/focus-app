'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function LogoutButton() {
  const pathname = usePathname()
  const supabase = createClient()
  const [loggedIn, setLoggedIn] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      setLoggedIn(!!user)
      setChecked(true)
    }
    check()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login?mode=login'
  }

  function handleLoginClick() {
    window.location.href = '/login?mode=login'
  }

  if (!checked) return null
  if (pathname === '/' || pathname === '/login') return null

  return (
    <button
      onClick={loggedIn ? handleLogout : handleLoginClick}
      className="btn-secondary"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        fontSize: 13,
        padding: '8px 16px',
        zIndex: 100,
      }}
    >
      {loggedIn ? 'Log out' : 'Log in'}
    </button>
  )
}