'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function PlannerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

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
      .order('due_date', { ascending: true })
    setTasks(data || [])
  }

  async function handleAdd(e) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    if (trimmedTitle.length > 100) return

    await supabase.from('tasks').insert({
      user_id: user.id,
      title: trimmedTitle,
      course: course.trim().slice(0, 50) || null,
      due_date: dueDate || null,
    })

    setTitle('')
    setCourse('')
    setDueDate('')
    await loadTasks(user.id)
  }

  async function toggleComplete(taskId, current) {
    await supabase
      .from('tasks')
      .update({ completed: !current })
      .eq('id', taskId)
    await loadTasks(user.id)
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    await loadTasks(user.id)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  const visibleTasks = tasks.filter((t) => showCompleted || !t.completed)

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', fontFamily: 'sans-serif', padding: 20 }}>
      <h2>Planner</h2>

      <div style={{ display: 'flex', gap: 16, margin: '12px 0 20px', fontSize: 14 }}>
        <a href="/dashboard">Dashboard</a>
        <a href="/friends">Friends</a>
        <a href="/planner">Planner</a>
        <a href="/settings">Settings</a>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="task title"
          style={{ padding: 8 }}
          required
        />
        <input
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder="course (optional)"
          style={{ padding: 8 }}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ padding: 8 }}
        />
        <button type="submit" style={{ padding: 8 }}>Add task</button>
      </form>

      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
        />
        Show completed
      </label>

      {visibleTasks.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>No tasks yet</p>}

      {visibleTasks.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: '1px solid #eee',
            opacity: t.completed ? 0.5 : 1,
          }}
        >
          <div>
            <input
              type="checkbox"
              checked={t.completed}
              onChange={() => toggleComplete(t.id, t.completed)}
              style={{ marginRight: 8 }}
            />
            <span style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>
              {t.title}
            </span>
            {t.course && <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{t.course}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t.due_date && <span style={{ fontSize: 12, color: '#888' }}>{t.due_date}</span>}
            <button onClick={() => deleteTask(t.id)} style={{ fontSize: 11 }}>×</button>
          </div>
        </div>
      ))}
    </div>
  )
}