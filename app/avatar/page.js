'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'
import Character from '../components/Character'
import Loading from '../components/Loading'

export default function AvatarPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [avatars, setAvatars] = useState([])
  const [accessories, setAccessories] = useState([])
  const [ownedAccessoryIds, setOwnedAccessoryIds] = useState([])
  const [avatarIndex, setAvatarIndex] = useState(0)
  const [accessoryIndex, setAccessoryIndex] = useState(0)
  const [showAvatarGrid, setShowAvatarGrid] = useState(false)
  const [showAccessoryGrid, setShowAccessoryGrid] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadAll(user.id)
      setLoading(false)
    }
    load()
  }, [])

  async function loadAll(userId) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, equippedAccessory:accessories(id, type, name)')
      .eq('id', userId)
      .single()
    setProfile(profileData)

    const { data: avatarData } = await supabase
      .from('avatars')
      .select('*')
      .order('tier', { ascending: true })
    const list = avatarData || []
    setAvatars(list)

    const currentIdx = list.findIndex(a => a.id === profileData?.avatar_id)
    if (currentIdx >= 0) setAvatarIndex(currentIdx)

    const { data: accessoryData } = await supabase.from('accessories').select('*').order('price_xp', { ascending: true })
    setAccessories(accessoryData || [])

    const { data: owned } = await supabase.from('owned_accessories').select('accessory_id').eq('user_id', userId)
    const ownedIds = (owned || []).map(o => o.accessory_id)
    setOwnedAccessoryIds(ownedIds)

    const equippedIdx = (accessoryData || []).findIndex(a => a.id === profileData?.equipped_accessory_id)
    if (equippedIdx >= 0) setAccessoryIndex(equippedIdx)
  }

  function isAvatarUnlocked(avatar) {
    if (avatar.tier === 'starter') return true
    if (avatar.tier === 'og') return profile?.is_og_tester
    if (avatar.tier === 'earned') return (profile?.xp || 0) >= avatar.unlock_xp
    if (avatar.tier === 'shop') return profile?.avatar_id === avatar.id
    return false
  }

  async function equipAvatar(avatar) {
    if (!isAvatarUnlocked(avatar)) return
    await supabase.from('profiles').update({ avatar_id: avatar.id }).eq('id', user.id)
    setProfile({ ...profile, avatar_id: avatar.id })
  }

  async function equipAccessory(accessory) {
    const isEquipped = profile?.equipped_accessory_id === accessory.id
    const newId = isEquipped ? null : accessory.id
    await supabase.from('profiles').update({ equipped_accessory_id: newId }).eq('id', user.id)
    setProfile({ ...profile, equipped_accessory_id: newId, equippedAccessory: newId ? accessory : null })
  }

  if (loading) return <Loading />

  const currentAvatarInList = avatars[avatarIndex]
  const equippedType = profile?.equippedAccessory?.type || null
  const currentAccessory = accessories[accessoryIndex]

  const tierLabel = { starter: 'Starter', og: 'OG', earned: 'Earned', shop: 'Shop' }

  return (
    <div className="page-fade" style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Avatar</h1>

      <Nav />

      {/* AVATAR CAROUSEL */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h4 style={{ fontSize: 15 }}>Select avatar</h4>
          <button onClick={() => setShowAvatarGrid(!showAvatarGrid)} className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>
            {showAvatarGrid ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {showAvatarGrid ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
            {avatars.map((a, i) => {
              const unlocked = isAvatarUnlocked(a)
              const equipped = profile?.avatar_id === a.id
              return (
                <div
                  key={a.id}
                  onClick={() => { setAvatarIndex(i); if (unlocked) equipAvatar(a) }}
                  style={{
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: 8,
                    borderRadius: 8,
                    opacity: unlocked ? 1 : 0.4,
                    background: equipped ? 'var(--surface-raised)' : 'transparent',
                    border: equipped ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  <Character color={a.color} color2={a.color2} species={a.species} size={44} />
                  <div style={{ fontSize: 10, marginTop: 4 }}>{a.name}</div>
                </div>
              )
            })}
          </div>
        ) : (
          currentAvatarInList && (() => {
            const unlocked = isAvatarUnlocked(currentAvatarInList)
            const equipped = profile?.avatar_id === currentAvatarInList.id

            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <button
                    onClick={() => setAvatarIndex((i) => (i - 1 + avatars.length) % avatars.length)}
                    className="btn-secondary"
                    style={{ width: 36, height: 36, borderRadius: '50%', padding: 0 }}
                  >
                    ←
                  </button>

                  <div style={{ opacity: unlocked ? 1 : 0.4 }}>
                    <Character
                      color={currentAvatarInList.color}
                      color2={currentAvatarInList.color2}
                      species={currentAvatarInList.species}
                      accessoryType={equipped ? equippedType : null}
                      size={90}
                    />
                  </div>

                  <button
                    onClick={() => setAvatarIndex((i) => (i + 1) % avatars.length)}
                    className="btn-secondary"
                    style={{ width: 36, height: 36, borderRadius: '50%', padding: 0 }}
                  >
                    →
                  </button>
                </div>

                <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600, fontFamily: 'Fraunces, serif' }}>
                  {currentAvatarInList.name}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {tierLabel[currentAvatarInList.tier]}
                  {currentAvatarInList.tier === 'earned' && ` · ${unlocked ? 'Unlocked' : `${profile?.xp || 0}/${currentAvatarInList.unlock_xp} XP`}`}
                  {currentAvatarInList.tier === 'og' && !unlocked && ' · OG only'}
                  {currentAvatarInList.tier === 'shop' && !unlocked && ` · ${currentAvatarInList.price_xp} XP in shop`}
                </div>

                <div style={{ marginTop: 12 }}>
                  {equipped ? (
                    <span style={{ fontSize: 12, color: 'var(--accent)' }}>Equipped</span>
                  ) : unlocked ? (
                    <button onClick={() => equipAvatar(currentAvatarInList)} style={{ fontSize: 13, padding: '7px 18px' }}>Equip</button>
                  ) : currentAvatarInList.tier === 'shop' ? (
                    <a href="/shop" style={{ fontSize: 12 }}>Buy in shop →</a>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Locked</span>
                  )}
                </div>
              </>
            )
          })()
        )}
      </div>

      {/* ACCESSORY CAROUSEL */}
      <div className="card" style={{ textAlign: 'center', marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h4 style={{ fontSize: 15 }}>Accessories</h4>
          <button onClick={() => setShowAccessoryGrid(!showAccessoryGrid)} className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>
            {showAccessoryGrid ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {accessories.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No accessories yet.</p>
        ) : showAccessoryGrid ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
            {accessories.map((acc, i) => {
              const owned = ownedAccessoryIds.includes(acc.id)
              const equipped = profile?.equipped_accessory_id === acc.id
              return (
                <div
                  key={acc.id}
                  onClick={() => { setAccessoryIndex(i); if (owned) equipAccessory(acc) }}
                  style={{
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: 8,
                    borderRadius: 8,
                    opacity: owned ? 1 : 0.4,
                    background: equipped ? 'var(--surface-raised)' : 'transparent',
                    border: equipped ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  <Character color="#8B9198" color2="#6B7178" species="blob" accessoryType={acc.type} size={44} />
                  <div style={{ fontSize: 10, marginTop: 4 }}>{acc.name}</div>
                </div>
              )
            })}
          </div>
        ) : currentAccessory && (() => {
          const owned = ownedAccessoryIds.includes(currentAccessory.id)
          const equipped = profile?.equipped_accessory_id === currentAccessory.id

          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <button
                  onClick={() => setAccessoryIndex((i) => (i - 1 + accessories.length) % accessories.length)}
                  className="btn-secondary"
                  style={{ width: 36, height: 36, borderRadius: '50%', padding: 0 }}
                >
                  ←
                </button>

                <div style={{ opacity: owned ? 1 : 0.4 }}>
                  <Character color="#8B9198" color2="#6B7178" species="blob" accessoryType={currentAccessory.type} size={70} />
                </div>

                <button
                  onClick={() => setAccessoryIndex((i) => (i + 1) % accessories.length)}
                  className="btn-secondary"
                  style={{ width: 36, height: 36, borderRadius: '50%', padding: 0 }}
                >
                  →
                </button>
              </div>

              <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600, fontFamily: 'Fraunces, serif' }}>
                {currentAccessory.name}
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {owned ? 'Owned' : `${currentAccessory.price_xp} XP in shop`}
              </div>

              <div style={{ marginTop: 12 }}>
                {equipped ? (
                  <button onClick={() => equipAccessory(currentAccessory)} className="btn-secondary" style={{ fontSize: 13, padding: '7px 18px' }}>
                    Unequip
                  </button>
                ) : owned ? (
                  <button onClick={() => equipAccessory(currentAccessory)} style={{ fontSize: 13, padding: '7px 18px' }}>
                    Equip
                  </button>
                ) : (
                  <a href="/shop" style={{ fontSize: 12 }}>Buy in shop →</a>
                )}
              </div>
            </>
          )
        })()}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <a href="/shop" style={{ fontSize: 12 }}>Browse more in shop →</a>
        </div>
      </div>
    </div>
  )
}