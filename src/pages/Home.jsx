import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  categories,
  carBrandLogos,
} from '../data'
import { fetchOffers } from '../lib/api'
import { useSeller } from '../context/useSeller'
import useCatalog from '../hooks/useCatalog'
import ProductCard from '../components/ProductCard'
import ProductArt from '../components/ProductArt'
import OfferPopup from '../components/OfferPopup'
import AddProduct from '../components/AddProduct'
import HeroCarousel from '../components/HeroCarousel'
import {
  IconArrowRight,
  IconClock,
  IconGauge,
  IconShield,
  IconTruck,
  IconPlus,
} from '../components/icons'

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

function CategoryShowcase() {
  const navigate = useNavigate()
  return (
    <section className="sec">
      <div className="container">
        <div className="sec-head">
          <h2>Shop by Category</h2>
          <Link to="/shop" className="sec-link">All categories <IconArrowRight width="14" height="14" /></Link>
        </div>
        <div className="cat-grid">
          {categories.map((c) => (
            <button
              key={c.id}
              className="cat-card card"
              onClick={() => navigate(`/shop?cat=${c.id}`)}
            >
              <span className="cat-card-art">
                <ProductArt category={c.icon} showImage={true} alt={c.name} />
              </span>
              <span className="cat-card-name">{c.short}</span>
              <span className="cat-card-count">{c.name}</span>
            </button>
          ))}
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
                <h3>{o.title}</h3>
                {o.description && <p>{o.description}</p>}
                {o.product && (
                  <div className="offer-zone-product">
                    <span className="offer-zone-brand">{o.product.brand}</span>
                    <span className="offer-zone-pname">{o.product.name}</span>
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

function BrandSection() {
  const navigate = useNavigate()
  return (
    <section className="sec">
      <div className="container">
        <div className="sec-head">
          <h2>Shop by Brand</h2>
          <Link to="/shop" className="sec-link">All brands <IconArrowRight width="14" height="14" /></Link>
        </div>
        <div className="brand-grid">
          {Object.entries(carBrandLogos).map(([name, slug]) => (
            <button
              key={name}
              className="brand-tile card"
              onClick={() => navigate(`/shop?make=${encodeURIComponent(name)}`)}
            >
              <img
                className="brand-tile-logo"
                src={`/images/brands/${slug}.svg`}
                alt={`${name} logo`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <span className="brand-tile-name">{name}</span>
            </button>
          ))}
        </div>
      </div>
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
            <span>Shop now</span>
          </div>
          <div className="promo-strip-col" onClick={() => navigate('/shop?cat=electrical')}>
            <span className="promo-strip-tag">Popular</span>
            <strong>Battery & Electrical</strong>
            <span>Shop now</span>
          </div>
          <div className="promo-strip-col" onClick={() => navigate('/shop?cat=braking')}>
            <span className="promo-strip-tag">Top Rated</span>
            <strong>Brake Pads & Discs</strong>
            <span>Shop now</span>
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

function Perks() {  const perks = [
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
      <HeroCarousel />
      <CategoryMarquee />
      <CategoryShowcase />
      <BrandSection />
      <OfferZone offers={offers} />
      <FeaturedParts />
      <PromoStrip />
      <NewArrivals />
      <OffersSection offers={offers} />
      <Perks />
      <OfferPopup offers={offers} />
    </div>
  )
}
