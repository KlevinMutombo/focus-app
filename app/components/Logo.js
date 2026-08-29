export default function Logo() {
  const style = {
    position: 'fixed',
    top: 20,
    left: 20,
    fontFamily: 'Fraunces, serif',
    fontWeight: 700,
    fontSize: 19,
    color: 'var(--text)',
    zIndex: 100,
  }

  return <a href="/" style={style}>Momenta</a>
}