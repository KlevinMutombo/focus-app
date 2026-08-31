'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import Nav from '../../components/Nav'
import Character from '../../components/Character'
import Loading from '../../components/Loading'

export default function ProfilePage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [avatar, setAvatar] = useState(null)
  const [equippedAccessoryType, setEquippedAccessoryType] = useState(null)
  const [ownedAvatars, setOwnedAvatars] = useState([])
  const [mutualFriends, setMutualFriends] = useState([])
  const [friendCount, setFriendCount] = useState(0)
  const [isFriend, setIsFriend] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [friendshipId, setFriendshipId] = useState(null)
  const [posts, setPosts] = useState([])
  const [isBlocked, setIsBlocked] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportMessage, setReportMessage] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, avatars(color, color2, species, name), equippedAccessory:accessories(type)')
        .ilike('username', params.username)
        .maybeSingle()

      if (!profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData)
      setAvatar(profileData.avatars)
      setEquippedAccessoryType(profileData.equippedAccessory?.type || null)

      const { data: blockCheck } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', profileData.id)
        .maybeSingle()
      setIsBlocked(!!blockCheck)

      const { data: allAvatars } = await supabase.from('avatars').select('*')
      const owned = (allAvatars || []).filter((a) => {
        if (a.tier === 'starter') return true
        if (a.tier === 'og') return profileData.is_og_tester
        if (a.tier === 'earned') return profileData.xp >= a.unlock_xp
        if (a.tier === 'shop') return profileData.avatar_id === a.id
        return false
      })
      setOwnedAvatars(owned)

      const { data: sentF } = await supabase.from('friendships').select('friend_id').eq('user_id', profileData.id).eq('status', 'accepted')
      const { data: recvF } = await supabase.from('friendships').select('user_id').eq('friend_id', profileData.id).eq('status', 'accepted')
      const theirFriendIds = [...(sentF || []).map(f => f.friend_id), ...(recvF || []).map(f => f.user_id)]
      setFriendCount(theirFriendIds.length)

      if (profileData.id !== user.id) {
        const { data: relCheck } = await supabase
          .from('friendships')
          .select('id, status')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${profileData.id}),and(user_id.eq.${profileData.id},friend_id.eq.${user.id})`)
          .maybeSingle()

        if (relCheck?.status === 'accepted') {
          setIsFriend(true)
          setFriendshipId(relCheck.id)
        } else if (relCheck?.status === 'pending') {
          setIsPending(true)
        }

        const { data: mySentF } = await supabase.from('friendships').select('friend_id').eq('user_id', user.id).eq('status', 'accepted')
        const { data: myRecvF } = await supabase.from('friendships').select('user_id').eq('friend_id', user.id).eq('status', 'accepted')
        const myFriendIds = [...(mySentF || []).map(f => f.friend_id), ...(myRecvF || []).map(f => f.user_id)]

        const mutualIds = theirFriendIds.filter((id) => myFriendIds.includes(id))
        if (mutualIds.length > 0) {
          const { data: mutualProfiles } = await supabase.from('profiles').select('id, username').in('id', mutualIds)
          setMutualFriends(mutualProfiles || [])
        }
      }

      const { data: postsData } = await supabase
        .from('activity_posts')
        .select('id, created_at, sessions(label, minutes, xp_earned)')
        .eq('user_id', profileData.id)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(10)
      setPosts(postsData || [])

      setLoading(false)
    }
    load()
  }, [params.username])

  async function sendFriendRequest() {
    await supabase.from('friendships').insert({
      user_id: currentUser.id,
      friend_id: profile.id,
      status: 'pending',
    })
    setIsPending(true)
  }

  async function removeFriend() {
    if (!friendshipId) return
    const confirmed = window.confirm('Remove this friend?')
    if (!confirmed) return
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setIsFriend(false)
    setFriendshipId(null)
    setFriendCount((c) => Math.max(c - 1, 0))
  }

  async function handleBlock() {
    const confirmed = window.confirm(`Block ${profile.username}? They won't be able to see your activity or interact with you, and you won't see theirs.`)
    if (!confirmed) return
  
    await supabase.from('blocked_users').insert({
      blocker_id: currentUser.id,
      blocked_id: profile.id,
      blocked_username: profile.username,
    })
  
    if (friendshipId) {
      await supabase.from('friendships').delete().eq('id', friendshipId)
    }
  
    setIsBlocked(true)
    setIsFriend(false)
    setFriendshipId(null)
    setShowMenu(false)
  }

  async function handleUnblock() {
    await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', currentUser.id)
      .eq('blocked_id', profile.id)
    setIsBlocked(false)
    setShowMenu(false)
  }

  async function submitReport() {
    const trimmed = reportReason.trim()
    if (!trimmed) {
      setReportMessage('Please describe the issue.')
      return
    }
    if (trimmed.length > 300) {
      setReportMessage('Keep it under 300 characters.')
      return
    }

    await supabase.from('reports').insert({
      reporter_id: currentUser.id,
      reported_id: profile.id,
      reason: trimmed,
    })

    setReportMessage('Report submitted. Thank you.')
    setReportReason('')
    setTimeout(() => {
      setShowReportForm(false)
      setReportMessage('')
      setShowMenu(false)
    }, 1500)
  }

  if (loading) return <Loading />
  if (notFound) return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <Nav />
      <div className="card" style={{ marginTop: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No user found with that username.</p>
      </div>
    </div>
  )

  const isOwnProfile = currentUser?.id === profile?.id

  return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <Nav />

      <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 32, position: 'relative' }}>
        {!isOwnProfile && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="btn-secondary"
              style={{ fontSize: 14, padding: '4px 10px', lineHeight: 1 }}
            >
              ⋯
            </button>
            {showMenu && (
              <div className="card" style={{ position: 'absolute', top: 32, right: 0, width: 180, padding: 8, zIndex: 10 }}>
                {isBlocked ? (
                  <button onClick={handleUnblock} className="btn-secondary" style={{ width: '100%', fontSize: 12, marginBottom: 6 }}>
                    Unblock
                  </button>
                ) : (
                  <button onClick={handleBlock} className="btn-secondary" style={{ width: '100%', fontSize: 12, marginBottom: 6, color: 'var(--danger)' }}>
                    Block
                  </button>
                )}
                <button onClick={() => setShowReportForm(!showReportForm)} className="btn-secondary" style={{ width: '100%', fontSize: 12 }}>
                  Report
                </button>
              </div>
            )}
          </div>
        )}

        {isBlocked ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🚫</div>
            <h1 style={{ fontSize: 20 }}>{profile.username}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>You've blocked this user.</p>
            <button onClick={handleUnblock} className="btn-secondary" style={{ marginTop: 16, fontSize: 12 }}>
              Unblock
            </button>
          </>
        ) : (
          <>
            {avatar && <Character color={avatar.color} color2={avatar.color2} species={avatar.species} accessoryType={equippedAccessoryType} size={80} />}
            <h1 style={{ fontSize: 24, marginTop: 12 }}>{profile.username}</h1>
            {avatar && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{avatar.name}</div>}

            <div className="mono" style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, fontSize: 13 }}>
              <div><b style={{ color: 'var(--accent)' }}>{profile.xp}</b> <span style={{ color: 'var(--text-muted)' }}>XP</span></div>
              <div><b style={{ color: 'var(--accent)' }}>{friendCount}</b> <span style={{ color: 'var(--text-muted)' }}>{friendCount === 1 ? 'friend' : 'friends'}</span></div>
              <div><b style={{ color: 'var(--accent)' }}>{profile.streak}</b> <span style={{ color: 'var(--text-muted)' }}>streak</span></div>
            </div>

            {!isOwnProfile && !isFriend && !isPending && (
              <button onClick={sendFriendRequest} style={{ marginTop: 16 }}>Add friend</button>
            )}
            {!isOwnProfile && isPending && (
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>Request pending</div>
            )}
            {!isOwnProfile && isFriend && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Already friends</div>
                <button onClick={removeFriend} className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
                  Remove friend
                </button>
              </div>
            )}
            {isOwnProfile && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                <button onClick={() => router.push('/avatar')} className="btn-secondary">Edit avatar</button>
                <button onClick={() => router.push('/shop')} className="btn-secondary">Shop</button>
              </div>
            )}
          </>
        )}

        {showReportForm && !isBlocked && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'left' }}>
            <p style={{ fontSize: 13, marginBottom: 8 }}>Report {profile.username}</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="What's the issue?"
              rows={3}
              style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'vertical' }}
              maxLength={300}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={submitReport} style={{ fontSize: 12, padding: '6px 14px' }}>Submit report</button>
              <button onClick={() => { setShowReportForm(false); setReportMessage('') }} className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
                Cancel
              </button>
            </div>
            {reportMessage && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{reportMessage}</p>}
          </div>
        )}
      </div>

      {!isBlocked && !isOwnProfile && mutualFriends.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 15, marginBottom: 10 }}>Mutual friends</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {mutualFriends.map((f) => (
              <a key={f.id} href={`/profile/${f.username}`} style={{ fontSize: 12, border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 20 }}>
                {f.username}
              </a>
            ))}
          </div>
        </div>
      )}

      {!isBlocked && (
        <div className="card" style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 15, marginBottom: 12 }}>Avatars unlocked ({ownedAvatars.length})</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 10 }}>
            {ownedAvatars.map((a) => (
              <div key={a.id} style={{ textAlign: 'center' }}>
                <Character color={a.color} color2={a.color2} species={a.species} size={40} />
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{a.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isBlocked && (
        <div className="card" style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 15, marginBottom: 12 }}>Activity</h4>
          {posts.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {isOwnProfile ? "You haven't shared any sessions yet." : "No public activity yet."}
            </p>
          )}
          {posts.map((post) => (
            <div key={post.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="mono" style={{ fontSize: 13 }}>
                {post.sessions?.label} — {post.sessions?.minutes}m — <span style={{ color: 'var(--accent)' }}>+{post.sessions?.xp_earned} xp</span>
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(post.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}