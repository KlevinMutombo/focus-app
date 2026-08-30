export default function TermsPage() {
    return (
      <div className="page-fade" style={{ maxWidth: 640, margin: '48px auto', padding: '0 20px' }}>
        <a href="/" style={{ display: 'inline-block', marginBottom: 20, fontSize: 13 }}>← Back to home</a>
        <h1 style={{ fontSize: 28, marginBottom: 24 }}>Terms of Service</h1>
  
        <div className="card" style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: 16 }}><i>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</i></p>
  
          <h4 style={{ color: 'var(--text)', marginTop: 20, marginBottom: 8 }}>Using Momenta</h4>
          <p style={{ marginBottom: 16 }}>
            Momenta is a focus and productivity tool provided as-is, currently in active development. By creating an account, you agree to use it responsibly and not attempt to disrupt, exploit, or abuse the service.
          </p>
  
          <h4 style={{ color: 'var(--text)', marginTop: 20, marginBottom: 8 }}>Your content</h4>
          <p style={{ marginBottom: 16 }}>
            You retain ownership of the content you create (tasks, comments, session labels). You're responsible for what you post, especially anything shared publicly with friends through the activity feed.
          </p>
  
          <h4 style={{ color: 'var(--text)', marginTop: 20, marginBottom: 8 }}>Acceptable use</h4>
          <p style={{ marginBottom: 16 }}>
            You agree not to harass other users, impersonate others, attempt to manipulate XP or leaderboards through fraudulent means, or use the service for anything illegal.
          </p>
  
          <h4 style={{ color: 'var(--text)', marginTop: 20, marginBottom: 8 }}>No guarantees</h4>
          <p style={{ marginBottom: 16 }}>
            This app is under active development and provided without warranty. Features may change, and we may need to modify or discontinue parts of the service.
          </p>
  
          <h4 style={{ color: 'var(--text)', marginTop: 20, marginBottom: 8 }}>Account termination</h4>
          <p style={{ marginBottom: 16 }}>
            You can delete your account at any time from Settings. We reserve the right to suspend accounts that violate these terms.
          </p>
  
          <h4 style={{ color: 'var(--text)', marginTop: 20, marginBottom: 8 }}>Contact</h4>
          <p style={{ marginBottom: 0 }}>
            Questions about these terms can be sent to [your email here].
          </p>
        </div>
      </div>
    )
  }