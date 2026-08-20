import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  formatINR,
  categories,
} from '../data'
import { fetchOffers, fetchBanner, updateBanner } from '../lib/api'
import { useSeller } from '../context/useSeller'
import useCatalog from '../hooks/useCatalog'
import ProductCard from '../components/ProductCard'
import ProductArt from '../components/ProductArt'
import OfferPopup from '../components/OfferPopup'
import AddProduct from '../components/AddProduct'
import {
  IconArrowRight,
  IconClock,
  IconGauge,
  IconPackage,
  IconShield,
  IconTruck,
  IconBolt,
  IconPlus,
} from '../components/icons'

const defaultBanner = { badge: 'SALE', title: 'Up to 40% Off on Braking Parts', desc: 'Pads, rotors, calipers & more — genuine brands at clearance prices.', image: '' }

function CategoryMarquee() {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)

  return (
    <section className="cat-marquee-wrap">
      <div
        className={`cat-marquee ${paused ? 'paused' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
      >
        <div className="cat-marquee-track">
          {[...categories, ...categories, ...categories].map((c, i) => (
            <button
              key={`${c.id}-${i}`}
              className="cat-marquee-item"
              onClick={() => navigate(`/shop?cat=${c.id}`)}
            >
              <span className="cat-marquee-icon">
                <ProductArt category={c.icon} showImage={true} />
              </span>
              <span className="cat-marquee-label">{c.short}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function SaleBanner() {
  const navigate = useNavigate()
  const { isSeller, token: sellerToken } = useSeller()
  const [banner, setBanner] = useState(defaultBanner)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(defaultBanner)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef(null)

  useEffect(() => {
    fetchBanner()
      .then((data) => { setBanner(data); setDraft(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }))

  const handleSave = async () => {
    try {
      const updated = await updateBanner(draft, sellerToken)
      setBanner(updated)
      setDraft(updated)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Failed to save: ' + (err.message || 'Unknown error'))
    }
  }

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDraft((d) => ({ ...d, image: reader.result }))
    reader.readAsDataURL(file)
  }

  if (editing) {
    return (
      <section className="sec">
        <div className="container">
          <div className="sale-banner seller-banner-edit">
            <div className="sale-banner-content">
              <input className="sb-edit-badge" value={draft.badge} onChange={set('badge')} placeholder="Badge" />
              <input className="sb-edit-title" value={draft.title} onChange={set('title')} placeholder="Title" />
              <input className="sb-edit-desc" value={draft.desc} onChange={set('desc')} placeholder="Description" />
              <div className="sb-edit-img-row">
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
                <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>Upload Image</button>
                <input className="sb-edit-url" value={draft.image} onChange={set('image')} placeholder="Or paste image URL" />
              </div>
              <div className="sb-edit-actions">
                <button className="btn btn-primary btn-sm" onClick={handleSave}>Save Banner</button>
                <button className="btn btn-sm" onClick={() => { setDraft(banner); setEditing(false) }}>Cancel</button>
              </div>
            </div>
            {draft.image && (
              <div className="sale-banner-art sale-banner-art-edit">
                <img src={draft.image} alt="Banner" />
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="sec">
      <div className="container">
        <div className={`sale-banner ${isSeller ? 'seller-clickable' : ''}`} onClick={() => !isSeller && navigate('/shop')}>
          {isSeller && (
            <button className="sb-seller-edit-btn" onClick={(e) => { e.stopPropagation(); setDraft(banner); setEditing(true) }} title="Edit banner">
              &#9998;
            </button>
          )}
          {saved && <div className="sb-saved-toast">Banner updated!</div>}
          <div className="sale-banner-content">
            <span className="sale-badge">{banner.badge}</span>
            <h2>{banner.title}</h2>
            <p>{banner.desc}</p>
            <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate('/shop') }}>
              Shop the Sale <IconArrowRight width="14" height="14" />
            </button>
          </div>
          <div className="sale-banner-art">
            {banner.image ? <img src={banner.image} alt="Sale" /> : <ProductArt category="braking" />}
          </div>
        </div>
      </div>
    </section>
  )
}

function OfferZone({ offers }) {
  const navigate = useNavigate()
  if (!offers.length) return null
  return (
    <section className="sec">
      <div className="container">
        <div className="sec-head">
          <h2>Offer Zone</h2>
          <Link to="/shop" className="sec-link">View all <IconArrowRight width="14" height="14" /></Link>
        </div>
        <div className="offer-zone-grid">
          {offers.slice(0, 5).map((o) => (
            <div
              key={o.id}
              className="offer-zone-card card"
              onClick={() => o.product ? navigate(`/product/${o.product.id}`) : navigate('/shop')}
            >
              {o.image && (
                <div className="offer-zone-img">
                  <img src={o.image} alt={o.title} />
                </div>
              )}
              <div className="offer-zone-body">
                {o.badge && <span className="offer-zone-badge">{o.badge}</span>}
                {o.discount_pct > 0 && (
                  <span className="offer-zone-badge offer-zone-badge--pct">
                    {o.discount_pct}% OFF
                  </span>
                )}
                <h3>{o.title}</h3>
                {o.description && <p>{o.description}</p>}
                {o.product && (
                  <div className="offer-zone-product">
                    <span className="offer-zone-brand">{o.product.brand}</span>
                    <span className="offer-zone-pname">{o.product.name}</span>
                    <div className="offer-zone-prices">
                      {o.product.mrp > o.product.price && (
                        <del>{formatINR(o.product.mrp)}</del>
                      )}
                      <strong>{formatINR(o.product.price)}</strong>
                      {o.product.mrp > o.product.price && (
                        <em>Save {formatINR(o.product.mrp - o.product.price)}</em>
                      )}
                    </div>
                  </div>
                )}
                <button className="btn btn-primary btn-sm">
                  Shop now <IconArrowRight width="14" height="14" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedParts() {
  const { products } = useCatalog()
  const { isSeller } = useSeller()
  const [showAdd, setShowAdd] = useState(false)
  const featured = products.filter((p) => p.popular)
  if (!featured.length) return null
  return (
    <section className="sec">
      <div className="container">
        <div className="sec-head">
          <h2>Offer Zone</h2>
          <div className="sec-head-right">
            {isSeller && (
              <button className="seller-add-btn seller-add-btn-sm" onClick={() => setShowAdd(true)}>
                <IconPlus width="14" height="14" /> Add
              </button>
            )}
            <Link to="/shop" className="sec-link">See all <IconArrowRight width="14" height="14" /></Link>
          </div>
        </div>
        <div className="grid-products">
          {featured.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
      {showAdd && <AddProduct onClose={() => setShowAdd(false)} />}
    </section>
  )
}

function PromoStrip() {
  const navigate = useNavigate()
  return (
    <section className="sec">
      <div className="container">
        <div className="promo-strip">
          <div className="promo-strip-col" onClick={() => navigate('/shop?cat=filters')}>
            <span className="promo-strip-tag">Trending</span>
            <strong>Oil & Air Filters</strong>
            <span>From ₹299</span>
          </div>
          <div className="promo-strip-col" onClick={() => navigate('/shop?cat=electrical')}>
            <span className="promo-strip-tag">Popular</span>
            <strong>Battery & Electrical</strong>
            <span>Starting ₹499</span>
          </div>
          <div className="promo-strip-col" onClick={() => navigate('/shop?cat=braking')}>
            <span className="promo-strip-tag">Top Rated</span>
            <strong>Brake Pads & Discs</strong>
            <span>From ₹599</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function NewArrivals() {
  const { products } = useCatalog()
  const { isSeller } = useSeller()
  const [showAdd, setShowAdd] = useState(false)
  const arrivals = products.slice(0, 4)
  if (!arrivals.length) return null
  return (
    <section className="sec">
      <div className="container">
        <div className="sec-head">
          <h2>Collections</h2>
          <div className="sec-head-right">
            {isSeller && (
              <button className="seller-add-btn seller-add-btn-sm" onClick={() => setShowAdd(true)}>
                <IconPlus width="14" height="14" /> Add
              </button>
            )}
            <Link to="/shop" className="sec-link">See all <IconArrowRight width="14" height="14" /></Link>
          </div>
        </div>
        <div className="grid-products">
          {arrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
      {showAdd && <AddProduct onClose={() => setShowAdd(false)} />}
    </section>
  )
}

function OffersSection({ offers }) {
  const navigate = useNavigate()
  if (!offers.length) return null
  return (
    <section className="sec">
      <div className="container">
        <div className="sec-head">
          <h2>Deals on Parts</h2>
          <Link to="/shop" className="sec-link">View all <IconArrowRight width="14" height="14" /></Link>
        </div>
        <div className="offers-grid">
          {offers.slice(0, 3).map((o) => (
            <div key={o.id} className="offer-banner card" onClick={() => navigate(o.product ? `/product/${o.product.id}` : '/shop')}>
              <div className="offer-banner-body">
                <span className="sec-kicker">{o.badge || 'Limited-time offer'}</span>
                <h3>{o.title}</h3>
                <p>{o.description}</p>
                <Link to={o.product ? `/product/${o.product.id}` : '/shop'} className="btn btn-primary btn-sm">
                  Shop now <IconArrowRight width="14" height="14" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { icon: <IconPackage width="24" height="24" />, title: 'Find the part', text: 'Search by part number or use fitment finder.' },
    { icon: <IconBolt width="24" height="24" />, title: 'Order in minutes', text: 'GST invoice, bulk quantities, fast checkout.' },
    { icon: <IconTruck width="24" height="24" />, title: 'Delivered fast', text: 'Metro in 12 hours, nationwide in 24-48 hrs.' },
  ]
  return (
    <section className="sec">
      <div className="container">
        <div className="sec-head"><h2>How It Works</h2></div>
        <div className="how-grid">
          {steps.map((s, i) => (
            <div key={s.title} className="how-step card">
              <span className="how-num">{i + 1}</span>
              <span className="how-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Perks() {
  const perks = [
    { icon: <IconShield width="22" height="22" />, t: '100% Genuine', s: 'OE & OES sourced' },
    { icon: <IconTruck width="22" height="22" />, t: 'Fast Delivery', s: '12-hr metro delivery' },
    { icon: <IconClock width="22" height="22" />, t: 'Easy Returns', s: 'Wrong or faulty, no drama' },
    { icon: <IconGauge width="22" height="22" />, t: 'Fitment Verified', s: 'Compatibility guaranteed' },
  ]
  return (
    <section className="sec">
      <div className="container">
        <div className="perks-grid">
          {perks.map((p) => (
            <div key={p.t} className="perk card">
              <span className="perk-icon">{p.icon}</span>
              <div>
                <strong>{p.t}</strong>
                <span>{p.s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const [offers, setOffers] = useState([])
  useEffect(() => {
    let cancelled = false
    fetchOffers()
      .then((data) => { if (!cancelled && Array.isArray(data)) setOffers(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <CategoryMarquee />
      <SaleBanner />
      <OfferZone offers={offers} />
      <FeaturedParts />
      <PromoStrip />
      <NewArrivals />
      <OffersSection offers={offers} />
      <HowItWorks />
      <Perks />
      <OfferPopup offers={offers} />
    </div>
  )
}
