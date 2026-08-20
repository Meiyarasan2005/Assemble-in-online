import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatINR } from '../data'
import { IconArrowRight, IconBolt, IconClock, IconX } from './icons'

const SEEN_KEY = 'meispare-offers-seen'

export default function OfferPopup({ offers }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const active = useMemo(() => Array.isArray(offers) ? offers : [], [offers])

  useEffect(() => {
    if (!active.length) return
    let seen = false
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      /* ignore */
    }
    if (!seen) {
      setOpen(true)
      try {
        sessionStorage.setItem(SEEN_KEY, '1')
      } catch {
        /* ignore */
      }
    }
  }, [active.length])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % active.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + active.length) % active.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, active.length])

  if (!open || !active.length) return null

  const offer = active[index % active.length]
  const savings =
    offer.product && offer.product.mrp > offer.product.price
      ? offer.product.mrp - offer.product.price
      : 0

  const go = () => {
    setOpen(false)
    if (offer.product) navigate(`/product/${offer.product.id}`)
    else navigate('/shop')
  }

  return (
    <div
      className="offer-popup-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Today's offers"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="offer-popup">
        <button
          className="offer-popup-close"
          onClick={() => setOpen(false)}
          aria-label="Close offers"
        >
          <IconX width="18" height="18" />
        </button>

        <div className="offer-popup-media">
          {offer.image ? (
            <img src={offer.image} alt={offer.title} />
          ) : (
            <div className="offer-popup-placeholder">
              <IconBolt width="34" height="34" />
            </div>
          )}
          <span className="offer-popup-badge">
            {offer.discount_pct > 0 ? `UP TO ${offer.discount_pct}% OFF` : offer.badge || 'SPECIAL OFFER'}
          </span>
        </div>

        <div className="offer-popup-body">
          <div className="offer-popup-kicker">
            <IconClock width="14" height="14" /> TODAY'S OFFERS
          </div>
          <h3>{offer.title}</h3>
          <p>{offer.description}</p>

          {offer.product && (
            <div className="offer-popup-product">
              <span className="offer-popup-brand">{offer.product.brand}</span>
              <span className="offer-popup-pname">{offer.product.name}</span>
              <span className="offer-popup-prices">
                {savings > 0 && <del>{formatINR(offer.product.mrp)}</del>}
                <strong>{formatINR(offer.product.price)}</strong>
                {savings > 0 && (
                  <em>Save {formatINR(savings)}</em>
                )}
              </span>
            </div>
          )}

          <div className="offer-popup-cta">
            <button className="btn btn-primary" onClick={go}>
              {offer.product ? 'Shop this part' : 'Browse offers'}{' '}
              <IconArrowRight width="16" height="16" />
            </button>
            <a href="#offers" onClick={() => setOpen(false)}>
              View all offers
            </a>
          </div>
        </div>

        {active.length > 1 && (
          <div className="offer-popup-nav">
            <div className="offer-popup-dots">
              {active.map((o, i) => (
                <button
                  key={o.id}
                  className={i === index ? 'on' : ''}
                  onClick={() => setIndex(i)}
                  aria-label={`Offer ${i + 1}`}
                />
              ))}
            </div>
            <button
              className="offer-popup-next"
              onClick={() => setIndex((i) => (i + 1) % active.length)}
              aria-label="Next offer"
            >
              <IconArrowRight width="16" height="16" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
