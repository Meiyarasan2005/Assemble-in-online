import { useEffect, useRef, useState } from 'react'

export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  duration = 1400,
  decimals = 0,
  className = '',
}) {
  const ref = useRef(null)
  const started = useRef(false)
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const final = () => value.toLocaleString('en-IN', { maximumFractionDigits: decimals })

    // Value changed after the first animation — jump straight to the new figure.
    if (started.current) {
      setDisplay(final())
      return
    }

    const run = () => {
      if (started.current) return
      started.current = true
      if (reduce) {
        setDisplay(final())
        return
      }
      const t0 = performance.now()
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration)
        const eased = 1 - Math.pow(1 - k, 3)
        setDisplay((value * eased).toLocaleString('en-IN', { maximumFractionDigits: decimals }))
        if (k < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run()
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration, decimals])

  return (
    <span ref={ref} className={`countup ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
