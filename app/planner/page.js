'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function getUrgency(dueDate) {
  if (!dueDate) return { level: 'none', label: '', days: Infinity }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { level: 'overdue', label: 'Overdue', days: diffDays }
  if (diffDays === 0) return { level: 'today', label: 'Due today', days: diffDays }
  if (diffDays <= 2) return { level: 'urgent', label: `Due in ${diffDays}d`, days: diffDays }
  if (diffDays <= 7) return { level: 'soon', label: `Due in ${diffDays}d`, days: diffDays }
  return { level: 'later', label: `Due in ${diffDays}d`, days: diffDays }
}

const urgencyColors = {
  overdue: '#c0392b',
  today: '#e67e22',
  urgent: '#e67e22',
  soon: '#f1c40f',
  later: '#888',
  none: '#ccc',
}

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
  const [subtaskDrafts, setSubtaskDrafts] = useState({})
  const [expanded, setExpanded] = useState({})

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

  async function addSubtask(parentId) {
    const draft = (subtaskDrafts[parentId] || '').trim()
    if (!draft || draft.length > 100) return

    const parent = tasks.find((t) => t.id === parentId)

    await supabase.from('tasks').insert({
      user_id: user.id,
      title: draft,
      parent_task_id: parentId,
      due_date: parent?.due_date || null,
    })

    setSubtaskDrafts((prev) => ({ ...prev, [parentId]: '' }))
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

  const topLevelTasks = tasks.filter((t) => !t.parent_task_id)
  const getSubtasks = (parentId) => tasks.filter((t) => t.parent_task_id === parentId)

  const activeTopLevel = topLevelTasks
    .filter((t) => !t.completed)
    .map((t) => ({ ...t, urgency: getUrgency(t.due_date) }))
    .sort((a, b) => a.urgency.days - b.urgency.days)

  const visibleTopLevel = topLevelTasks
    .filter((t) => showCompleted || !t.completed)
    .map((t) => ({ ...t, urgency: getUrgency(t.due_date) }))
    .sort((a, b) => a.urgency.days - b.urgency.days)

  const suggested = activeTopLevel[0]

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', fontFamily: 'sans-serif', padding: 20 }}>
      <h2>Planner</h2>

      <div style={{ display: 'flex', gap: 16, margin: '12px 0 20px', fontSize: 14 }}>
        <a href="/dashboard">Dashboard</a>
        <a href="/friends">Friends</a>
        <a href="/planner">Planner</a>
        <a href="/settings">Settings</a>
      </div>

    {suggested && (
    <div className="glass-card" style={{
        borderColor: urgencyColors[suggested.urgency.level],
        boxShadow: `0 0 24px ${urgencyColors[suggested.urgency.level]}33`,
        marginBottom: 24,
    }}>
    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
      Do this next
    </div>
    <div style={{ fontSize: 20, fontWeight: 700, margin: '6px 0', fontFamily: 'Space Grotesk, sans-serif' }}>
      {suggested.title}
    </div>
    <div style={{ fontSize: 13, color: urgencyColors[suggested.urgency.level], fontWeight: 600 }}>
      {suggested.course && `${suggested.course} — `}
      {suggested.urgency.label || 'No due date'}
    </div>
  </div>
    )}

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

      {visibleTopLevel.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>No tasks yet</p>}

      {visibleTopLevel.map((t) => {
        const subtasks = getSubtasks(t.id)
        const isExpanded = expanded[t.id]

        return (
          <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: t.completed ? 0.5 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={() => toggleComplete(t.id, t.completed)}
                  style={{ marginRight: 8 }}
                />
                <span
                  onClick={() => setExpanded((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                  style={{ textDecoration: t.completed ? 'line-through' : 'none', cursor: 'pointer' }}
                >
                  {t.title} {subtasks.length > 0 && <span style={{ fontSize: 10, color: '#888' }}>({subtasks.filter(s => s.completed).length}/{subtasks.length})</span>}
                </span>
                {t.course && <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{t.course}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {t.due_date && (
                  <span style={{ fontSize: 11, color: urgencyColors[t.urgency.level], fontWeight: 600 }}>
                    {t.urgency.label}
                  </span>
                )}
                <button onClick={() => setExpanded((prev) => ({ ...prev, [t.id]: !prev[t.id] }))} style={{ fontSize: 11 }}>
                  {isExpanded ? '▾' : '▸'}
                </button>
                <button onClick={() => deleteTask(t.id)} style={{ fontSize: 11 }}>×</button>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginLeft: 24, marginTop: 6, paddingLeft: 10, borderLeft: '1px dotted #ccc' }}>
                {subtasks.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', opacity: s.completed ? 0.5 : 1 }}>
                    <div>
                      <input
                        type="checkbox"
                        checked={s.completed}
                        onChange={() => toggleComplete(s.id, s.completed)}
                        style={{ marginRight: 8 }}
                      />
                      <span style={{ fontSize: 13, textDecoration: s.completed ? 'line-through' : 'none' }}>{s.title}</span>
                    </div>
                    <button onClick={() => deleteTask(s.id)} style={{ fontSize: 10 }}>×</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input
                    value={subtaskDrafts[t.id] || ''}
                    onChange={(e) => setSubtaskDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="add a step"
                    style={{ flex: 1, fontSize: 12, padding: 6 }}
                  />
                  <button onClick={() => addSubtask(t.id)} style={{ fontSize: 11 }}>+</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}