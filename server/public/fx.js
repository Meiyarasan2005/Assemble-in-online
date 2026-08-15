/* Mei Spare · Inventory Admin — 3D micro-interactions */
;(function () {
  'use strict'

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return

  /* mouse-tilt on stat cards & panels */
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest('.stat, .panel')
    if (!el || el.closest('.modal')) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transition = 'transform .12s ease-out'
    el.style.transform =
      'perspective(900px) rotateX(' +
      (-py * 5).toFixed(2) +
      'deg) rotateY(' +
      (px * 7).toFixed(2) +
      'deg) translateY(-2px)'
  })

  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest('.stat, .panel')
    if (!el) return
    el.style.transition = 'transform .45s cubic-bezier(.22,1,.36,1)'
    el.style.transform = ''
  })

  /* count-up animation for dashboard stats */
  function animateValue(node) {
    const raw = node.dataset.val
    if (raw == null || node.dataset.animated) return
    node.dataset.animated = '1'
    const target = Number(raw)
    const isMoney = node.classList.contains('inr')
    const dur = 900
    const t0 = performance.now()
    const fmt = (n) => (isMoney ? '₹' : '') + new Intl.NumberFormat('en-IN').format(Math.round(n))
    node.textContent = fmt(0)
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur)
      const ease = 1 - Math.pow(1 - k, 3)
      node.textContent = fmt(target * ease)
      if (k < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const statsObserver = new MutationObserver(() => {
    document.querySelectorAll('.stat .v[data-val]').forEach(animateValue)
  })
  statsObserver.observe(document.body, { childList: true, subtree: true })
})()
