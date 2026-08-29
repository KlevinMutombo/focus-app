export default function Nav() {
  return (
    <div className="glass-card" style={{
      display: 'flex',
      gap: 20,
      padding: '14px 20px',
      marginBottom: 28,
      flexWrap: 'wrap',
    }}>
      <a href="/dashboard">Dashboard</a>
      <a href="/friends">Friends</a>
      <a href="/feed">Feed</a>
      <a href="/planner">Planner</a>
      <a href="/calendar">Calendar</a>
      <a href="/avatar">Avatar</a>
      <a href="/settings">Settings</a>
    </div>
  )
}