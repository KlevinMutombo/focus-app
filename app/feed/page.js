'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function FeedPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [kudosMap, setKudosMap] = useState({})
  const [commentsMap, setCommentsMap] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadFeed()
      setLoading(false)
    }
    load()
  }, [])

  async function loadFeed() {
    const { data: postsData } = await supabase
      .from('activity_posts')
      .select('id, user_id, is_private, created_at, sessions(label, minutes, xp_earned), profiles(username)')
      .order('created_at', { ascending: false })
      .limit(30)

    setPosts(postsData || [])

    if (postsData && postsData.length > 0) {
      const postIds = postsData.map(p => p.id)

      const { data: kudosData } = await supabase
        .from('kudos')
        .select('post_id, user_id')
        .in('post_id', postIds)

      const kMap = {}
      ;(kudosData || []).forEach((k) => {
        if (!kMap[k.post_id]) kMap[k.post_id] = []
        kMap[k.post_id].push(k.user_id)
      })
      setKudosMap(kMap)

      const { data: commentsData } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at, profiles(username)')
        .in('post_id', postIds)
        .order('created_at', { ascending: true })

      const cMap = {}
      ;(commentsData || []).forEach((c) => {
        if (!cMap[c.post_id]) cMap[c.post_id] = []
        cMap[c.post_id].push(c)
      })
      setCommentsMap(cMap)
    }
  }

  async function toggleKudos(postId) {
    const alreadyGiven = (kudosMap[postId] || []).includes(user.id)

    if (alreadyGiven) {
      await supabase.from('kudos').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('kudos').insert({ post_id: postId, user_id: user.id })
    }
    await loadFeed()
  }

  async function addComment(postId) {
    const content = (commentDrafts[postId] || '').trim()
    if (!content || content.length > 300) return

    await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content,
    })

    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
    await loadFeed()
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <h1 className="gradient-text" style={{ fontSize: 32, marginBottom: 20 }}>Feed</h1>

      <Nav />

      {posts.length === 0 && (
        <div className="glass-card" style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            No shared sessions yet — end a focus session and choose "Share to feed" to post here.
          </p>
        </div>
      )}

      {posts.map((post) => {
        const kudosGiven = (kudosMap[post.id] || []).includes(user.id)
        const kudosCount = (kudosMap[post.id] || []).length
        const postComments = commentsMap[post.id] || []
        const isOwnPrivate = post.user_id === user.id && post.is_private

        return (
          <div key={post.id} className="glass-card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><b>{post.profiles?.username}</b> finished a session</span>
                {isOwnPrivate && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>
                🔒 Only you
              </span>
                )}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
              {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(post.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div className="mono" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              {post.sessions?.label} — {post.sessions?.minutes}m — <span style={{ color: 'var(--accent)' }}>+{post.sessions?.xp_earned} xp</span>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <button
                onClick={() => toggleKudos(post.id)}
                className={kudosGiven ? '' : 'icon-button'}
                style={{ fontSize: 12, padding: '5px 12px' }}
              >
                👏 {kudosCount > 0 ? kudosCount : ''}
              </button>
            </div>

            {postComments.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {postComments.map((c) => (
                  <div key={c.id} style={{ fontSize: 12, padding: '4px 0', color: 'var(--text-muted)' }}>
                    <b style={{ color: 'var(--text)' }}>{c.profiles?.username}</b> {c.content}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={commentDrafts[post.id] || ''}
                onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                placeholder="add a comment"
                style={{ flex: 1, fontSize: 12, padding: 8 }}
              />
              <button onClick={() => addComment(post.id)} style={{ fontSize: 12, padding: '8px 14px' }}>Post</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}