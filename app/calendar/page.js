'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'

function toDateKey(date) {
  return date.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newCourse, setNewCourse] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadTasks(user.id)
      setLoading(false)
    }
    load()
  }, [])

  async function loadTasks(userId) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .not('due_date', 'is', null)
    setTasks(data || [])
  }

  async function addTaskOnDay(dateKey) {
    const trimmed = newTitle.trim()
    if (!trimmed || trimmed.length > 100) return

    await supabase.from('tasks').insert({
      user_id: user.id,
      title: trimmed,
      course: newCourse.trim().slice(0, 50) || null,
      due_date: dateKey,
    })

    setNewTitle('')
    setNewCourse('')
    await loadTasks(user.id)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const tasksByDate = {}
  tasks.forEach((t) => {
    if (!tasksByDate[t.due_date]) tasksByDate[t.due_date] = []
    tasksByDate[t.due_date].push(t)
  })

  const todayKey = toDateKey(new Date())

  function changeMonth(delta) {
    setViewDate(new Date(year, month + delta, 1))
    setSelectedDay(null)
  }

  return (
    <div className="page-fade" style={{ maxWidth: 720, margin: '48px auto', padding: '0 20px' }}>
      <h1 className="gradient-text" style={{ fontSize: 32, marginBottom: 20 }}>Calendar</h1>

      <Nav />

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => changeMonth(-1)} className="icon-button">←</button>
          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={() => changeMonth(1)} className="icon-button">→</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateKey = toDateKey(new Date(year, month, day))
            const dayTasks = tasksByDate[dateKey] || []
            const isToday = dateKey === todayKey
            const isSelected = selectedDay === dateKey

            return (
              <div
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                style={{
                  minHeight: 64,
                  padding: 6,
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(124, 92, 255, 0.18)' : 'transparent',
                  border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <div className="mono" style={{ fontSize: 11, color: isToday ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isToday ? 700 : 400 }}>
                  {day}
                </div>
                {dayTasks.slice(0, 2).map((t) => (
                  <div key={t.id} style={{
                    fontSize: 10,
                    marginTop: 2,
                    padding: '2px 4px',
                    borderRadius: 4,
                    background: t.completed ? 'rgba(74, 222, 158, 0.2)' : 'rgba(124, 92, 255, 0.2)',
                    color: t.completed ? 'var(--success)' : 'var(--accent)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                    +{dayTasks.length - 2} more
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="glass-card" style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 12 }}>{selectedDay}</h4>

          {(tasksByDate[selectedDay] || []).map((t) => (
            <div key={t.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--glass-border)' }}>
              {t.title} {t.course && <span style={{ color: 'var(--text-muted)' }}>— {t.course}</span>}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="task title"
              style={{ flex: 1.5 }}
            />
            <input
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              placeholder="course (optional)"
              style={{ flex: 1 }}
            />
            <button onClick={() => addTaskOnDay(selectedDay)}>Add</button>
          </div>
        </div>
      )}
    </div>
  )
}