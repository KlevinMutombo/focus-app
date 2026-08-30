'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'
import Character from '../components/Character'

export default function ShopPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [accessories, setAccessories] = useState([])
  const [ownedAccessoryIds, setOwnedAccessoryIds] = useState([])
  const [shopAvatars, setShopAvatars] = useState([])
  const [message, setMessage] = useState('')
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
      .select('*, avatarInfo:avatars(color, color2, species), equippedAccessory:accessories(type)')
      .eq('id', userId)
      .single()
    setProfile(profileData)

    const { data: allAccessories } = await supabase.from('accessories').select('*').order('price_xp', { ascending: true })
    setAccessories(allAccessories || [])

    const { data: owned } = await supabase.from('owned_accessories').select('accessory_id').eq('user_id', userId)
    setOwnedAccessoryIds((owned || []).map(o => o.accessory_id))

    const { data: shopAv } = await supabase.from('avatars').select('*').eq('tier', 'shop')
    setShopAvatars(shopAv || [])
  }

  async function buyAccessory(accessory) {
    setMessage('')
    if (profile.xp < accessory.price_xp) {
      setMessage("You don't have enough XP for that yet.")
      return
    }
    await supabase.from('owned_accessories').insert({ user_id: user.id, accessory_id: accessory.id })
    const newXp = profile.xp - accessory.price_xp
    await supabase.from('profiles').update({ xp: newXp }).eq('id', user.id)
    setProfile({ ...profile, xp: newXp })
    setOwnedAccessoryIds((prev) => [...prev, accessory.id])
    setMessage(`Purchased ${accessory.name}!`)
  }

  async function equipAccessory(accessory) {
    const isEquipped = profile?.equipped_accessory_id === accessory.id
    const newId = isEquipped ? null : accessory.id
    await supabase.from('profiles').update({ equipped_accessory_id: newId }).eq('id', user.id)
    setProfile({ ...profile, equipped_accessory_id: newId, equippedAccessory: newId ? { type: accessory.type } : null })
  }

  async function buyAvatar(avatar) {
    setMessage('')
    if (profile.xp < avatar.price_xp) {
      setMessage("You don't have enough XP for that yet.")
      return
    }
    const newXp = profile.xp - avatar.price_xp
    await supabase.from('profiles').update({ xp: newXp, avatar_id: avatar.id }).eq('id', user.id)
    setProfile({ ...profile, xp: newXp, avatar_id: avatar.id, avatarInfo: { color: avatar.color, color2: avatar.color2, species: avatar.species } })
    setMessage(`Purchased and equipped ${avatar.name}!`)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  const equippedType = profile?.equippedAccessory?.type || null

  return (
    <div className="page-fade" style={{ maxWidth: 560, margin: '48px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Shop</h1>

      <Nav />

      <div className="card" style={{ marginTop: 20, textAlign: 'center' }}>
        {profile?.avatarInfo && (
          <Character
            color={profile.avatarInfo.color}
            color2={profile.avatarInfo.color2}
            species={profile.avatarInfo.species}
            accessoryType={equippedType}
            size={90}
          />
        )}
        <div className="mono" style={{ marginTop: 10, fontSize: 14 }}>
          Your XP: <b style={{ color: 'var(--accent)' }}>{profile?.xp}</b>
        </div>
        {message && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{message}</p>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 16, marginBottom: 14 }}>Accessories</h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
          {accessories.map((acc) => {
            const owned = ownedAccessoryIds.includes(acc.id)
            const equipped = profile?.equipped_accessory_id === acc.id

            return (
              <div key={acc.id} style={{ textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <Character color="#8B9198" color2="#6B7178" species="blob" accessoryType={acc.type} size={48} />
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{acc.name}</div>
                {!owned ? (
                  <button onClick={() => buyAccessory(acc)} style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}>
                    {acc.price_xp} XP
                  </button>
                ) : equipped ? (
                  <button onClick={() => equipAccessory(acc)} className="btn-secondary" style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}>
                    Unequip
                  </button>
                ) : (
                  <button onClick={() => equipAccessory(acc)} className="btn-secondary" style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}>
                    Equip
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 16, marginBottom: 12 }}>Premium avatars (Coming soon...)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
          {shopAvatars.map((av) => {
            const isEquipped = profile?.avatar_id === av.id
            return (
              <div key={av.id} style={{ textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <Character color={av.color} color2={av.color2} species={av.species} size={48} />
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{av.name}</div>
                {isEquipped ? (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--accent)' }}>Equipped</div>
                ) : (
                  <button onClick={() => buyAvatar(av)} style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}>
                    {av.price_xp} XP
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}