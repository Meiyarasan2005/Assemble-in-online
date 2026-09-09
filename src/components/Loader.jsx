import { useEffect, useState } from 'react'

const MESSAGES = [
  'INITIALIZING...',
  'LOADING PARTS...',
  'READY TO DRIVE',
]

export default function Loader({ onDone }) {
  const [phase, setPhase] = useState(0)
  const [hide, setHide] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 350)
    const t2 = setTimeout(() => setPhase(2), 750)
    const t3 = setTimeout(() => setPhase(3), 1100)
    const t4 = setTimeout(() => setHide(true), 1400)
    const t5 = setTimeout(() => onDone?.(), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5) }
  }, [onDone])

  return (
    <div className={`loader ${hide ? 'loader--out' : ''}`} aria-hidden="true">
      <div className="loader-inner">
        <img className="loader-logo" src="/logo.jpeg" alt="" />
        <div className="loader-bar">
          <div className="loader-bar-fill" />
        </div>
        <p className="loader-text">{MESSAGES[Math.min(phase, 2)]}</p>
      </div>
    </div>
  )
}
