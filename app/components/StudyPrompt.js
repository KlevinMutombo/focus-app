'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function getDismissed() {
  try {
    return JSON.parse(sessionStorage.getItem('momenta_dismissed_prompts') || '[]')
  } catch {
    return []
  }
}

function addDismissed(id) {
  const current = getDismissed()
  sessionStorage.setItem('momenta_dismissed_prompts', JSON.stringify([...current, id]))
}

export default function StudyPrompt() {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    if (pathname === '/' || pathname === '/login' || pathname.startsWith('/onboarding')) return

    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const dismissedIds = getDismissed()

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, scheduled_time, completed')
        .eq('user_id', user.id)
        .eq('due_date', todayKey)
        .eq('completed', false)
        .not('scheduled_time', 'is', null)

      const due = (tasks || []).find((t) => {
        if (dismissedIds.includes(t.id)) return false
        const [h, m] = t.scheduled_time.split(':').map(Number)
        const taskMinutes = h * 60 + m
        return currentMinutes >= taskMinutes && currentMinutes <= taskMinutes + 30
      })

      setPrompt(due || null)
    }

    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [pathname])

  function dismiss() {
    if (prompt) addDismissed(prompt.id)
    setPrompt(null)
  }

  async function markDone() {
    if (!prompt) return
    await supabase.from('tasks').update({ completed: true }).eq('id', prompt.id)
    addDismissed(prompt.id)
    setPrompt(null)
  }

  function startNow() {
    if (!prompt) return
    sessionStorage.setItem('momenta_prefill_label', prompt.title)
    addDismissed(prompt.id)
    setPrompt(null)
    router.push('/dashboard')
  }

  if (!prompt) return null

  return (
    <div style={{
      position: 'fixed',
      top: 100,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      maxWidth: 360,
      width: 'calc(100% - 40px)',
    }}>
      <div className="card-raised" style={{ padding: 16, borderColor: 'var(--accent)' }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>
          Time to study
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{prompt.title}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={startNow} style={{ fontSize: 13, padding: '6px 16px' }}>Start now</button>
          <button onClick={markDone} className="btn-secondary" style={{ fontSize: 13, padding: '6px 16px' }}>Mark done</button>
          <button onClick={dismiss} className="btn-secondary" style={{ fontSize: 13, padding: '6px 16px' }}>Dismiss</button>
        </div>
      </div>
    </div>
  )
}