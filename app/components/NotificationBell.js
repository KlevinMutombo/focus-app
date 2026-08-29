'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'

export default function NotificationBell() {
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unseenCount, setUnseenCount] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      await loadNotifications(user.id)
    }
    load()
  }, [])

  async function loadNotifications(userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_checked_notifications')
      .eq('id', userId)
      .single()

    const lastChecked = profile?.last_checked_notifications || new Date(0).toISOString()

    const { data: myPosts } = await supabase
      .from('activity_posts')
      .select('id')
      .eq('user_id', userId)

    const postIds = (myPosts || []).map(p => p.id)
    if (postIds.length === 0) return

    const { data: kudosData } = await supabase
      .from('kudos')
      .select('id, post_id, user_id, created_at, profiles(username)')
      .in('post_id', postIds)
      .neq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: commentsData } = await supabase
      .from('comments')
      .select('id, post_id, user_id, content, created_at, profiles(username)')
      .in('post_id', postIds)
      .neq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const combined = [
      ...(kudosData || []).map(k => ({ type: 'kudos', ...k })),
      ...(commentsData || []).map(c => ({ type: 'comment', ...c })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setNotifications(combined)
    setUnseenCount(combined.filter(n => new Date(n.created_at) > new Date(lastChecked)).length)
  }

  async function handleOpen() {
    setOpen(!open)
    if (!open && user) {
      await supabase.from('profiles').update({ last_checked_notifications: new Date().toISOString() }).eq('id', user.id)
      setUnseenCount(0)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 80, zIndex: 100 }}>
      {open && (
        <div className="glass-card" style={{
          position: 'absolute',
          bottom: 56,
          right: 0,
          width: 280,
          maxHeight: 340,
          overflowY: 'auto',
          padding: 16,
        }}>
          <h4 style={{ marginBottom: 10, fontSize: 14 }}>Notifications</h4>
          {notifications.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nothing yet</p>
          )}
          {notifications.map((n) => (
            <div key={`${n.type}-${n.id}`} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--glass-border)' }}>
              {n.type === 'kudos' ? (
                <span><b>{n.profiles?.username}</b> gave you kudos 👏</span>
              ) : (
                <span><b>{n.profiles?.username}</b> commented: "{n.content}"</span>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={handleOpen}
        className="icon-button"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          position: 'relative',
        }}
      >
        🔔
        {unseenCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            background: 'var(--danger)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: '50%',
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unseenCount}
          </span>
        )}
      </button>
    </div>
  )
}