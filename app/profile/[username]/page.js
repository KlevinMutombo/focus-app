'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import Nav from '../../components/Nav'
import Character from '../../components/Character'

export default function ProfilePage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [avatar, setAvatar] = useState(null)
  const [ownedAvatars, setOwnedAvatars] = useState([])
  const [mutualFriends, setMutualFriends] = useState([])
  const [friendCount, setFriendCount] = useState(0)
  const [isFriend, setIsFriend] = useState(false)
  const [posts, setPosts] = useState([])
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
        .select('*, avatars(color, color2, species, name)')
        .ilike('username', params.username)
        .maybeSingle()

      if (!profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData)
      setAvatar(profileData.avatars)

      const { data: allAvatars } = await supabase.from('avatars').select('*')
      const owned = (allAvatars || []).filter((a) => {
        if (a.tier === 'starter') return true
        if (a.tier === 'og') return profileData.is_og_tester
        if (a.tier === 'earned') return profileData.xp >= a.unlock_xp
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
          .select('id')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${profileData.id}),and(user_id.eq.${profileData.id},friend_id.eq.${user.id})`)
          .eq('status', 'accepted')
          .maybeSingle()
        setIsFriend(!!relCheck)

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
    router.push('/friends')
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>
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

      <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 32 }}>
        {avatar && <Character color={avatar.color} color2={avatar.color2} species={avatar.species} size={80} />}
        <h1 style={{ fontSize: 24, marginTop: 12 }}>{profile.username}</h1>
        {avatar && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{avatar.name}</div>}

        <div className="mono" style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, fontSize: 13 }}>
          <div><b style={{ color: 'var(--accent)' }}>{profile.xp}</b> <span style={{ color: 'var(--text-muted)' }}>XP</span></div>
          <div><b style={{ color: 'var(--accent)' }}>{friendCount}</b> <span style={{ color: 'var(--text-muted)' }}>friends</span></div>
          <div><b style={{ color: 'var(--accent)' }}>{profile.streak}</b> <span style={{ color: 'var(--text-muted)' }}>streak</span></div>
        </div>

        {!isOwnProfile && !isFriend && (
          <button onClick={sendFriendRequest} style={{ marginTop: 16 }}>Add friend</button>
        )}
        {!isOwnProfile && isFriend && (
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>Already friends</div>
        )}
        {isOwnProfile && (
          <button onClick={() => router.push('/avatar')} className="btn-secondary" style={{ marginTop: 16 }}>Edit avatar</button>
        )}
      </div>

      {!isOwnProfile && mutualFriends.length > 0 && (
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
    </div>
  )
}