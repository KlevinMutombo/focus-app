export default function Logo() {
    const style = {
      position: 'fixed',
      top: 20,
      left: 20,
      fontFamily: 'Space Grotesk, sans-serif',
      fontWeight: 700,
      fontSize: 18,
      zIndex: 100,
    }
  
    return <a href="/" style={style} className="gradient-text">Anchor</a>
  }