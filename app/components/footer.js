export default function Footer() {
    return (
      <footer style={{
        marginTop: 'auto',
        padding: '32px 20px',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 8, flexWrap: 'wrap' }}>
          <a href="/privacy" style={{ fontSize: 12 }}>Privacy Policy</a>
          <a href="/terms" style={{ fontSize: 12 }}>Terms of Service</a>
        </div>
        <div>© {new Date().getFullYear()} Momenta</div>
      </footer>
    )
  }