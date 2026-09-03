'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Nav from '../components/Nav'
import Loading from '../components/Loading'

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
  overdue: 'var(--danger)',
  today: '#C98A4B',
  urgent: '#C98A4B',
  soon: '#9C8B4E',
  later: 'var(--text-muted)',
  none: 'var(--text-muted)',
}

export default function PlannerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
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
      scheduled_time: scheduledTime || null,
    })

    setTitle('')
    setCourse('')
    setDueDate('')
    setScheduledTime('')
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

  if (loading) return <Loading />

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
    <div className="page-fade" style={{ maxWidth: 560, margin: '48px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Planner</h1>

      <Nav />

      {suggested && (
        <div className="card-raised" style={{
          borderColor: urgencyColors[suggested.urgency.level],
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Do this next
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, margin: '8px 0 4px', fontFamily: 'Fraunces, serif' }}>
            {suggested.title}
          </div>
          <div className="mono" style={{ fontSize: 13, color: urgencyColors[suggested.urgency.level], fontWeight: 600 }}>
            {suggested.course && `${suggested.course} — `}
            {suggested.urgency.label || 'No due date'}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="task title"
            required
          />
          <input
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="course (optional)"
          />
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Due date (optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Time (optional)
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <button type="submit">Add task</button>
        </form>
      </div>

      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--text-muted)' }}>
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
          style={{ width: 'auto' }}
        />
        Show completed
      </label>

      <div className="card">
        {visibleTopLevel.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No tasks yet</p>}

        {visibleTopLevel.map((t, i) => {
          const subtasks = getSubtasks(t.id)
          const isExpanded = expanded[t.id]

          return (
            <div key={t.id} style={{
              padding: '14px 0',
              borderBottom: i < visibleTopLevel.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: t.completed ? 0.45 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => toggleComplete(t.id, t.completed)}
                    style={{ width: 'auto' }}
                  />
                  <span
                    onClick={() => setExpanded((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                    style={{
                      textDecoration: t.completed ? 'line-through' : 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {t.title}
                    {subtasks.length > 0 && (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                        ({subtasks.filter(s => s.completed).length}/{subtasks.length})
                      </span>
                    )}
                  </span>
                  {t.course && (
                    <span style={{
                      fontSize: 11,
                      color: 'var(--accent)',
                      border: '1px solid var(--border)',
                      padding: '2px 8px',
                      borderRadius: 20,
                    }}>
                      {t.course}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {t.due_date && (
                    <span className="mono" style={{ fontSize: 11, color: urgencyColors[t.urgency.level], fontWeight: 600 }}>
                      {t.urgency.label}{t.scheduled_time && ` · ${t.scheduled_time.slice(0, 5)}`}
                    </span>
                  )}
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                    className="btn-secondary"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                  >
                    {isExpanded ? '▾' : '▸'}
                  </button>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="btn-secondary"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginLeft: 30, marginTop: 10, paddingLeft: 14, borderLeft: '2px solid var(--border)' }}>
                  {subtasks.map((s) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', opacity: s.completed ? 0.45 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={s.completed}
                          onChange={() => toggleComplete(s.id, s.completed)}
                          style={{ width: 'auto' }}
                        />
                        <span style={{ fontSize: 13, textDecoration: s.completed ? 'line-through' : 'none' }}>{s.title}</span>
                      </div>
                      <button onClick={() => deleteTask(s.id)} className="btn-secondary" style={{ fontSize: 10, padding: '2px 6px' }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      value={subtaskDrafts[t.id] || ''}
                      onChange={(e) => setSubtaskDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      placeholder="add a step"
                      style={{ flex: 1, fontSize: 12, padding: 8 }}
                    />
                    <button onClick={() => addSubtask(t.id)} style={{ fontSize: 11, padding: '8px 14px' }}>+</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}