import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MIN_SCALE = 1
const MAX_SCALE = 6

export default function ImageZoom({ src, alt, onClose }) {
  const [scale, setScale] = useState(MIN_SCALE)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const cur = useRef({ scale: MIN_SCALE, x: 0, y: 0 })
  const stageRef = useRef(null)
  const imgRef = useRef(null)
  const pointers = useRef(new Map())
  const gesture = useRef({ scale: MIN_SCALE, x: 0, y: 0, startSx: 0, startSy: 0, dist: 0, cx: 0, cy: 0 })
  const lastTap = useRef(0)

  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (src) setFailed(false)
  }, [src])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const commit = (s, x, y) => {
    const stage = stageRef.current
    const img = imgRef.current
    let nx = x
    let ny = y
    if (stage && img) {
      const vw = stage.clientWidth
      const vh = stage.clientHeight
      const maxX = Math.max(0, (img.offsetWidth * s - vw) / 2)
      const maxY = Math.max(0, (img.offsetHeight * s - vh) / 2)
      nx = Math.min(maxX, Math.max(-maxX, x))
      ny = Math.min(maxY, Math.max(-maxY, y))
    }
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
    cur.current = { scale: ns, x: nx, y: ny }
    setScale(ns)
    setPos({ x: nx, y: ny })
  }

  const reset = () => commit(MIN_SCALE, 0, 0)

  const focusPoint = (x, y) => {
    const rect = stageRef.current.getBoundingClientRect()
    return { x: x - rect.left - rect.width / 2, y: y - rect.top - rect.height / 2 }
  }

  const seedSingle = (e) => {
    const f = focusPoint(e.clientX, e.clientY)
    const g = cur.current
    gesture.current = { scale: g.scale, x: g.x, y: g.y, startSx: f.x, startSy: f.y, dist: 0, cx: 0, cy: 0 }
  }

  const onPointerDown = (e) => {
    const stage = stageRef.current
    if (e.target === stage && cur.current.scale <= MIN_SCALE) {
      onClose()
      return
    }
    stage.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const n = pointers.current.size
    if (n === 1) {
      const now = Date.now()
      if (now - lastTap.current < 300) {
        lastTap.current = 0
        const g = cur.current
        if (g.scale > MIN_SCALE) {
          reset()
        } else {
          const f = focusPoint(e.clientX, e.clientY)
          const ns = 2.5
          commit(ns, f.x - f.x * ns, f.y - f.y * ns)
        }
        return
      }
      lastTap.current = now
      seedSingle(e)
    } else if (n === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = {
        scale: cur.current.scale,
        x: cur.current.x,
        y: cur.current.y,
        startSx: 0,
        startSy: 0,
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      }
    }
  }

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const n = pointers.current.size
    if (n === 2) {
      const [a, b] = [...pointers.current.values()]
      const g = gesture.current
      const d = Math.hypot(a.x - b.x, a.y - b.y) || g.dist
      const f = focusPoint(g.cx, g.cy)
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, g.scale * (d / g.dist)))
      const nx = f.x - (f.x - g.x) * (ns / g.scale)
      const ny = f.y - (f.y - g.y) * (ns / g.scale)
      commit(ns, nx, ny)
    } else if (n === 1) {
      const g = gesture.current
      const f = focusPoint(e.clientX, e.clientY)
      commit(cur.current.scale, g.x + (f.x - g.startSx), g.y + (f.y - g.startSy))
    }
  }

  const onPointerEnd = (e) => {
    pointers.current.delete(e.pointerId)
    const n = pointers.current.size
    if (n === 1) {
      const rem = [...pointers.current.values()][0]
      const g = cur.current
      const f = focusPoint(rem.x, rem.y)
      gesture.current = { scale: g.scale, x: g.x, y: g.y, startSx: f.x, startSy: f.y, dist: 0, cx: 0, cy: 0 }
    }
  }

  const onWheelRef = useRef(null)
  onWheelRef.current = (e) => {
    e.preventDefault()
    const g = cur.current
    const factor = Math.exp(-e.deltaY * 0.0012)
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, g.scale * factor))
    const f = focusPoint(e.clientX, e.clientY)
    const nx = f.x - (f.x - g.x) * (ns / g.scale)
    const ny = f.y - (f.y - g.y) * (ns / g.scale)
    commit(ns, nx, ny)
  }

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const handler = (e) => onWheelRef.current?.(e)
    stage.addEventListener('wheel', handler, { passive: false })
    return () => stage.removeEventListener('wheel', handler)
  }, [])

  return createPortal(
    <div className="zoom-overlay" role="dialog" aria-modal="true" aria-label={alt}>
      <div className="zoom-top">
        <span className="zoom-caption" title={alt}>{alt}</span>
        <span className="zoom-hint">Pinch / double-tap / scroll to zoom</span>
        <button className="zoom-close" onClick={onClose} aria-label="Close zoom">×</button>
      </div>
      <div
        className="zoom-stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {failed ? (
          <div className="zoom-fallback"><span>Image unavailable</span></div>
        ) : (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            draggable={false}
            onError={() => setFailed(true)}
            style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
          />
        )}
      </div>
      {scale > MIN_SCALE && (
        <div className="zoom-foot">
          <button className="zoom-reset" onClick={reset}>Reset zoom</button>
        </div>
      )}
    </div>,
    document.body,
  )
}