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

    let kudosData = []
    let commentsData = []

    if (postIds.length > 0) {
      const { data: k } = await supabase
        .from('kudos')
        .select('id, post_id, user_id, created_at, profiles!inner(username)')
        .in('post_id', postIds)
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      kudosData = k || []

      const { data: c } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at, profiles!inner(username)')
        .in('post_id', postIds)
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      commentsData = c || []
    }

    const { data: friendRequests } = await supabase
      .from('friendships')
      .select('id, created_at, profiles!friendships_user_id_fkey!inner(username)')
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: dismissed } = await supabase
      .from('dismissed_notifications')
      .select('notification_type, source_id')
      .eq('user_id', userId)

    const dismissedKeys = new Set((dismissed || []).map(d => `${d.notification_type}-${d.source_id}`))

    const combined = [
      ...kudosData.map(k => ({ type: 'kudos', ...k })),
      ...commentsData.map(c => ({ type: 'comment', ...c })),
      ...(friendRequests || []).map(f => ({ type: 'friend_request', ...f })),
    ]
      .filter(n => !dismissedKeys.has(`${n.type}-${n.id}`))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setNotifications(combined)
    setUnseenCount(combined.filter(n => new Date(n.created_at) > new Date(lastChecked)).length)
  }

  async function dismissNotification(n) {
    setNotifications((prev) => prev.filter((x) => !(x.type === n.type && x.id === n.id)))
    await supabase.from('dismissed_notifications').insert({
      user_id: user.id,
      notification_type: n.type,
      source_id: n.id,
    })
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
        <div className="card" style={{
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
            <div key={`${n.type}-${n.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                {n.type === 'kudos' && (
                  <span><b>{n.profiles?.username}</b> boosted you 🚀</span>
                )}
                {n.type === 'comment' && (
                  <span><b>{n.profiles?.username}</b> commented: "{n.content}"</span>
                )}
                {n.type === 'friend_request' && (
                  <span><b>{n.profiles?.username}</b> sent you a friend request</span>
                )}
              </div>
              <button
                onClick={() => dismissNotification(n)}
                className="icon-btn"
                style={{ fontSize: 12, lineHeight: 1, padding: '2px 4px', flexShrink: 0, color: 'var(--text-muted)' }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={handleOpen}
        className="icon-btn"
        style={{
          width: 42,
          height: 42,
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