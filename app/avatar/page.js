'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'
import Character from '../components/Character'

export default function AvatarPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [avatars, setAvatars] = useState([])
  const [loading, setLoading] = useState(true)
  const [previewSpecies, setPreviewSpecies] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, avatarInfo:avatars(color, color2, species)')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: avatarData } = await supabase
        .from('avatars')
        .select('*')
        .order('unlock_xp', { ascending: true, nullsFirst: true })
      setAvatars(avatarData || [])
      setLoading(false)
    }
    load()
  }, [])

  function isUnlocked(avatar) {
    if (avatar.tier === 'starter') return true
    if (avatar.tier === 'og') return profile?.is_og_tester
    if (avatar.tier === 'earned') return (profile?.xp || 0) >= avatar.unlock_xp
    return false
  }

  async function selectAvatar(avatar) {
    if (!isUnlocked(avatar)) return
    await supabase.from('profiles').update({ avatar_id: avatar.id }).eq('id', user.id)
    setProfile({ ...profile, avatar_id: avatar.id, avatarInfo: { color: avatar.color, color2: avatar.color2, species: avatar.species } })
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  const tierLabels = { starter: 'Starter', og: 'OG Exclusive', earned: 'Earned' }
  const grouped = { starter: [], og: [], earned: [] }
  avatars.forEach((a) => grouped[a.tier]?.push(a))

  const currentAvatar = avatars.find(a => a.id === profile?.avatar_id)

  return (
    <div className="page-fade" style={{ maxWidth: 560, margin: '48px auto', padding: '0 20px' }}>
      <h1 className="gradient-text" style={{ fontSize: 32, marginBottom: 20 }}>Avatar</h1>

      <Nav />

      <div className="glass-card" style={{ marginTop: 20, textAlign: 'center', padding: 32 }}>
        {currentAvatar ? (
          <Character color={currentAvatar.color} color2={currentAvatar.color2} species={currentAvatar.species} size={100} />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No avatar selected yet</div>
        )}
        {currentAvatar && (
          <div style={{ marginTop: 12, fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700 }}>
            {currentAvatar.name}
          </div>
        )}
      </div>

      {['starter', 'og', 'earned'].map((tier) => (
        <div key={tier} className="glass-card" style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 14 }}>{tierLabels[tier]}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 14 }}>
            {grouped[tier].map((a) => {
              const unlocked = isUnlocked(a)
              const selected = profile?.avatar_id === a.id
              const progress = a.tier === 'earned' ? Math.min((profile?.xp || 0) / a.unlock_xp * 100, 100) : null

              return (
                <div
                  key={a.id}
                  onClick={() => selectAvatar(a)}
                  style={{
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                    textAlign: 'center',
                    padding: 10,
                    borderRadius: 14,
                    background: selected ? 'rgba(124, 92, 255, 0.15)' : 'transparent',
                    border: selected ? '1px solid var(--accent)' : '1px solid transparent',
                  }}
                >
                  <div style={{ opacity: unlocked ? 1 : 0.35, position: 'relative' }}>
                    <Character color={a.color} color2={a.color2} species={a.species} size={56} />
                    {!unlocked && (
                      <span style={{ position: 'absolute', top: 0, right: 4, fontSize: 12 }}>🔒</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 6, color: unlocked ? 'var(--text)' : 'var(--text-muted)' }}>
                    {a.name}
                  </div>
                  {!unlocked && a.tier === 'earned' && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)' }} />
                      </div>
                      <div className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                        {profile?.xp || 0}/{a.unlock_xp} xp
                      </div>
                    </div>
                  )}
                  {!unlocked && a.tier === 'og' && (
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>OG only</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}