'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      setLoggedIn(!!user)
    }
    check()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login?mode=login')
  }

  if (!loggedIn) return null

  return (
    <button
      onClick={handleLogout}
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
      Log out
    </button>
  )
}