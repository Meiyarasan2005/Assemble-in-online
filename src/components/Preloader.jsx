import { useEffect, useRef } from 'react'

export default function Preloader({ hiding = false }) {
  const trackRef = useRef(null)
  const dashRef = useRef(null)
  const barRef = useRef(null)
  const draftRef = useRef(null)
  const phaseRef = useRef('in')
  const outStartRef = useRef(0)

  useEffect(() => {
    const track = trackRef.current
    const dash = dashRef.current
    const bar = barRef.current
    const draft = draftRef.current
    if (!track) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      track.style.transform = 'translateX(0)'
      if (bar) bar.style.width = '100%'
      return
    }

    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
    const easeIn = (t) => t * t * t
    let raf
    const start = performance.now()

    const tick = (now) => {
      const phase = phaseRef.current
      if (phase === 'in') {
        const t = Math.min(1, (now - start) / 1500)
        const p = easeInOut(t)
        track.style.transform = `translateX(${(-50 + 50 * p)}%)`
        if (bar) bar.style.width = `${(p * 100).toFixed(2)}%`
        if (dash) dash.style.animationDuration = `${(0.9 - 0.35 * p).toFixed(3)}s`
        if (draft) draft.style.transform = `scale(${(1 + 0.035 * p).toFixed(4)})`
      } else if (phase === 'out') {
        const t = Math.min(1, (now - outStartRef.current) / 520)
        track.style.transform = `translateX(${(55 * easeIn(t)).toFixed(2)}%)`
        if (draft) draft.style.transform = `scale(${(1.035 - 0.05 * easeIn(t)).toFixed(4)})`
        if (t >= 1) return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (hiding) {
      phaseRef.current = 'out'
      outStartRef.current = performance.now()
    }
  }, [hiding])

  return (
    <div
      className={`preloader ${hiding ? 'preloader-done' : ''}`}
      aria-hidden="true"
    >
      <div className="preloader-stage">
        <div className="preloader-draft" ref={draftRef}>
          <div className="preloader-scene">
            <div className="preloader-grid" />
            <div className="preloader-horizon">
              <div className="preloader-horizon-sky" />
              <div className="preloader-horizon-glow" />
              <div className="preloader-horizon-skyline" />
              <div className="preloader-horizon-posts" />
            </div>
            <div className="preloader-ground">
              <div className="preloader-road">
                <div className="preloader-road-dash" ref={dashRef} />
              </div>
              <div className="preloader-track" ref={trackRef}>
                <div className="preloader-run-unit">
                  <div className="preloader-run-ground-shadow" />
                  <div className="preloader-run-reflect" />
                  <div className="preloader-run-3d">
                    <div className="preloader-run-trail" />
                    <div className="preloader-run-rig">
                      <img className="preloader-run-ghost" src="/images/car-draft.png" alt="" />
                      <img className="preloader-run-ghost ghost-2" src="/images/car-draft.png" alt="" />
                      <img className="preloader-run-car" src="/images/car-draft.png" alt="" />
                      <div className="preloader-run-label">
                        <span>SPARE XPRESS · DRAFT</span>
                        <span>MODEL 2026 · OE SPEC</span>
                      </div>
                      <div className="preloader-run-beam" />
                      <div className="preloader-run-wheel wheel-r" />
                      <div className="preloader-run-wheel wheel-f" />
                      <div className="preloader-run-dust d-r1" />
                      <div className="preloader-run-dust d-r2" />
                      <div className="preloader-run-dust d-f1" />
                      <div className="preloader-run-dust d-f2" />
                      <div className="preloader-run-puffs">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="preloader-run-unit">
                  <div className="preloader-run-ground-shadow" />
                  <div className="preloader-run-reflect" />
                  <div className="preloader-run-3d">
                    <div className="preloader-run-trail" />
                    <div className="preloader-run-rig">
                      <img className="preloader-run-ghost" src="/images/car-draft.png" alt="" />
                      <img className="preloader-run-ghost ghost-2" src="/images/car-draft.png" alt="" />
                      <img className="preloader-run-car" src="/images/car-draft.png" alt="" />
                      <div className="preloader-run-label">
                        <span>SPARE XPRESS · DRAFT</span>
                        <span>MODEL 2026 · OE SPEC</span>
                      </div>
                      <div className="preloader-run-beam" />
                      <div className="preloader-run-wheel wheel-r" />
                      <div className="preloader-run-wheel wheel-f" />
                      <div className="preloader-run-dust d-r1" />
                      <div className="preloader-run-dust d-r2" />
                      <div className="preloader-run-dust d-f1" />
                      <div className="preloader-run-dust d-f2" />
                      <div className="preloader-run-puffs">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="preloader-wind">
              <span className="preloader-wind-line" />
              <span className="preloader-wind-line" />
              <span className="preloader-wind-line" />
              <span className="preloader-wind-line" />
            </div>
            <div className="preloader-sweep" />
            <div className="preloader-coords">
              <span>SPARE XPRESS · DRAFT</span>
              <span>MODEL 2026 · OE SPEC</span>
            </div>
          </div>
        </div>
        <div className="preloader-progress">
          <span ref={barRef} />
        </div>
        <img className="preloader-logo" src="/logo.png" alt="SpareXpress" />
        <div className="preloader-tag">drafting your parts…</div>
      </div>
      <div className="preloader-vignette" />
    </div>
  )
}
