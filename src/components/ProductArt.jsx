import { useState } from 'react'

const art = {
  braking: (
    <>
      <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="9" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M32 23V13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50 32h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  filters: (
    <>
      <path
        d="M22 18h20l10 14H12l10-14Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M26 18 17 32" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M36 18l-8 14" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M46 18l-8 14" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M12 34h40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 40h28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  engine: (
    <>
      <path d="M22 20h20v10H22z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M27 20v-6h10v6" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M27 30v8M37 30v8" stroke="currentColor" strokeWidth="2.5" />
      <path d="M32 30v8" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M32 20v6" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="32" cy="26" r="2.5" fill="currentColor" stroke="none" />
      <path d="M12 38h40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  suspension: (
    <>
      <path d="M52 16v26H24a8 8 0 0 1-8-8v-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 16h-8l-2 8 3 10 9 8h8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 16 16 48" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
      <path d="M20 40h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  electrical: (
    <>
      <circle cx="32" cy="32" r="17" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M32 17V9M32 55v-8M17 32H9M55 32h-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m32 24 6 8h-4l-2 8-6-8h4l2-8Z" fill="currentColor" stroke="none" />
    </>
  ),
  cooling: (
    <>
      <path d="M22 12h20v20H22z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M22 12v20M32 12v20M42 12v20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <path d="M18 34h28v6H18z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 32h6M46 32h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  transmission: (
    <>
      <circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="44" cy="40" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M32 30 38 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3.5" fill="currentColor" stroke="none" />
      <circle cx="44" cy="40" r="2.5" fill="currentColor" stroke="none" />
    </>
  ),
  care: (
    <>
      <path d="M22 14h20l4 8v16H18V22l4-8Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 28h28" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M14 46h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="38" r="2" fill="currentColor" stroke="none" />
    </>
  ),
}

const IMAGES = new Set([
  'braking',
  'filters',
  'engine',
  'suspension',
  'electrical',
  'cooling',
  'transmission',
  'care',
])

export default function ProductArt({ category, className = '', showImage = true, alt = '' }) {
  const [failed, setFailed] = useState(false)
  const stroke = art[category] || art.care

  if (showImage && !failed && IMAGES.has(category)) {
    return (
      <img
        className={className}
        src={`/images/${category}.jpg`}
        alt={alt || category}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    )
  }

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      role="presentation"
    >
      {stroke}
    </svg>
  )
}
