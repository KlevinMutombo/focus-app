'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import Character from '../../components/Character'

export default function OnboardingAvatarPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [avatars, setAvatars] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(null)

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
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      if (profileData?.avatar_id) {
        router.push('/dashboard')
        return
      }

      const { data: avatarData } = await supabase
        .from('avatars')
        .select('*')
        .in('tier', ['starter', 'og'])
        .order('tier', { ascending: true })
      setAvatars(avatarData || [])
      setLoading(false)
    }
    load()
  }, [])

  function isUnlocked(avatar) {
    if (avatar.tier === 'starter') return true
    if (avatar.tier === 'og') return profile?.is_og_tester
    return false
  }

  async function selectAvatar(avatar) {
    if (!isUnlocked(avatar)) return
    setSelecting(avatar.id)
    await supabase.from('profiles').update({ avatar_id: avatar.id }).eq('id', user.id)
    router.push('/dashboard')
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  const tierLabels = { starter: 'Starter', og: 'OG Exclusive' }
  const grouped = { starter: [], og: [] }
  avatars.forEach((a) => grouped[a.tier]?.push(a))

  return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Pick your avatar</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          You can change this anytime. More characters unlock as you earn XP.
        </p>
      </div>

      {['starter', 'og'].map((tier) => (
        grouped[tier].length > 0 && (
          <div key={tier} className="card" style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 15, marginBottom: 14 }}>{tierLabels[tier]}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 14 }}>
              {grouped[tier].map((a) => {
                const unlocked = isUnlocked(a)
                return (
                  <button
                    key={a.id}
                    onClick={() => selectAvatar(a)}
                    disabled={!unlocked || selecting}
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: 12,
                      opacity: unlocked ? 1 : 0.35,
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Character color={a.color} color2={a.color2} species={a.species} size={52} />
                    <span style={{ fontSize: 11 }}>{a.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      ))}
    </div>
  )
}