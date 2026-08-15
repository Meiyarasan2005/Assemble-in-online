import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  brands,
  formatINR,
  getCategory,
  preownedProducts,
  testimonials,
  vehicles,
} from '../data'
import { useStore } from '../context/useStore'
import useCatalog from '../hooks/useCatalog'
import ProductCard from '../components/ProductCard'
import ProductArt from '../components/ProductArt'
import Reveal from '../components/Reveal'
import CountUp from '../components/CountUp'
import CarScene from '../components/CarScene'
import TiltCard from '../components/TiltCard'
import useTilt from '../hooks/useTilt'
import {
  IconArrowRight,
  IconBolt,
  IconClock,
  IconGauge,
  IconPackage,
  IconSearch,
  IconShield,
  IconTruck,
  IconWrench,
  IconCheck,
  IconMapPin,
  IconCar,
} from '../components/icons'

function VehicleFinder() {
  const navigate = useNavigate()
  const makes = useMemo(() => [...new Set(vehicles.map((v) => v.make))], [])
  const [make, setMake] = useState('')
  const models = useMemo(() => vehicles.filter((v) => v.make === make), [make])
  const tilt = useTilt(6)

  const go = () => {
    if (!make) return
    const vehicle = models[0]
    navigate(`/shop?fitment=1&vehicle=${vehicle.id}`)
  }

  return (
    <div className="finder tilt" ref={tilt}>
      <div className="finder-head">
        <span className="finder-icon">
          <IconCar width="20" height="20" />
        </span>
        <div>
          <strong>Fitment finder</strong>
          <span>Parts guaranteed for your exact car</span>
        </div>
      </div>
      <div className="finder-grid">
        <select
          className="select"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          aria-label="Select car make"
        >
          <option value="">Make</option>
          {makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={make ? models[0]?.id || '' : ''}
          onChange={(e) => {
            const v = vehicles.find((x) => x.id === e.target.value)
            if (v) navigate(`/shop?fitment=1&vehicle=${v.id}`)
          }}
          disabled={!make}
          aria-label="Select car model"
        >
          <option value="">Model</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.model} · {m.engine}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={go} disabled={!make}>
          Show parts <IconArrowRight width="16" height="16" />
        </button>
      </div>
      <p className="finder-note">
        Covers 22,000+ parts across 20+ major car brands
      </p>
    </div>
  )
}

function Hero() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const submit = (e) => {
    e.preventDefault()
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <section className="hero">
      <Reveal variant="left" className="hero-copy">
        <span className="hero-kicker">
          <IconWrench width="15" height="15" /> GENUINE AUTO PARTS · INDIA WIDE
        </span>
        <h1 className="hero-title">
          Right part.
          <br />
          Right car. <span className="hero-hl">Next day.</span>
        </h1>
        <p className="hero-sub">
          SpareXpress is the marketplace where independent workshops and car
          owners buy genuine spares, OE and after-market parts — by part number
          or by fitment.
        </p>

        <form className="hero-search" onSubmit={submit}>
          <span className="hero-search-icon">
            <IconSearch width="20" height="20" />
          </span>
          <input
            className="hero-search-input"
            placeholder="Enter a part number — e.g. 0 986 AB1 238"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search by part number"
          />
          <button className="btn btn-primary">Search</button>
        </form>

        <div className="hero-links">
          <Link to="/shop" className="hero-link">
            <IconBolt width="17" height="17" /> Browse all parts
          </Link>
          <span className="hero-divider" />
          <span className="hero-trust">
            <IconShield width="17" height="17" /> 100% genuine · GST invoice
          </span>
        </div>
      </Reveal>

      <Reveal variant="right" delay={140} className="hero-side">
        <VehicleFinder />
        <div className="hero-quote card">
          <p>
            “Ordered pads and rotors by part number at 6 pm — delivered to our
            garage at 9 am. Zero phone calls, zero running around.”
          </p>
          <div className="hero-quote-foot">
            <span className="quote-avatar">RM</span>
            <div>
              <strong>Rakesh Mehta</strong>
              <span>Mehta Motors, Pune</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const STATS = [
  { n: 22000, suffix: '+', label: 'Live SKUs' },
  { n: 1800, suffix: '+', label: 'Partner workshops' },
  { n: 12, suffix: ' hrs', label: 'Metro delivery' },
  { n: 100, suffix: '%', label: 'Genuine parts' },
]

function StatsBar() {
  return (
    <Reveal variant="scale" className="stats card">
      {STATS.map((s) => (
        <div key={s.label} className="stat">
          <strong>
            <CountUp value={s.n} suffix={s.suffix} />
          </strong>
          <span>{s.label}</span>
        </div>
      ))}
    </Reveal>
  )
}

function ProductChip({ product }) {
  const cat = getCategory(product.category)
  const shown = product.price

  return (
    <Link to={`/product/${product.id}`} className="prod-chip">
      <span className={`prod-chip-art prod-chip-art-${cat.id}`}>
        <ProductArt category={cat.icon} showImage={false} />
      </span>
      <span className="prod-chip-body">
        <span className="prod-chip-brand">{product.brand}</span>
        <span className="prod-chip-name">{product.name}</span>
        <span className="prod-chip-foot">
          <span className="prod-chip-price">{formatINR(shown)}</span>
          <span className="prod-chip-arrow">→</span>
        </span>
      </span>
    </Link>
  )
}

function ProductsMarquee() {
  const { products } = useCatalog()
  if (!products.length) return null
  const half = Math.ceil(products.length / 2)
  const rows = [products.slice(0, half), products.slice(half)]

  return (
    <section className="sec">
      <Reveal className="sec-head">
        <div>
          <div className="sec-kicker">All parts · always in motion</div>
          <h2>Everything the garage needs</h2>
        </div>
        <Link to="/shop" className="sec-link">
          Open the full shop <IconArrowRight width="15" height="15" />
        </Link>
      </Reveal>

      <div className="prod-marquee">
        {rows.map((row, r) => (
          <Reveal
            key={r}
            delay={r * 100}
            className={`prod-marquee-row ${r % 2 === 1 ? 'prod-marquee-rev' : ''}`}
          >
            <div className="prod-marquee-track">
              {[...row, ...row].map((p, i) => (
                <ProductChip product={p} key={`${p.id}-${i}`} />
              ))}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function FeaturedParts() {
  const { products } = useCatalog()
  const featured = products.filter((p) => p.popular)
  if (!featured.length) return null
  return (
    <section className="sec">
      <Reveal className="sec-head">
        <div>
          <div className="sec-kicker">Most ordered</div>
          <h2>Popular with workshops</h2>
        </div>
        <Link to="/shop" className="sec-link">
          See everything <IconArrowRight width="15" height="15" />
        </Link>
      </Reveal>
      <div className="grid-featured">
        {featured.map((p, i) => (
          <Reveal key={p.id} delay={i * 60}>
            <ProductCard product={p} compact />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function PreOwnedStrip() {
  const navigate = useNavigate()
  const { mode, toggleMode } = useStore()
  const sample = preownedProducts[0]

  const browse = () => {
    if (mode !== 'preowned') toggleMode()
    navigate('/shop')
  }

  return (
    <Reveal className="preowned card">
      <div className="preowned-art">
        <ProductArt category="braking" />
      </div>
      <div className="preowned-copy">
        <span className="sec-kicker">Certified pre-owned</span>
        <h2>Same part. Big savings.</h2>
        <p>
          Genuine, tested pre-owned parts from verified cars — inspected,
          graded and backed by a 3-month warranty.
        </p>
        <ul className="preowned-list">
          <li>
            <IconCheck width="16" height="16" /> Up to 60% below the new price
          </li>
          <li>
            <IconCheck width="16" height="16" /> Inspected & graded (Excellent / Good / Fair)
          </li>
          <li>
            <IconCheck width="16" height="16" /> 3-month warranty on every unit
          </li>
          <li>
            <IconCheck width="16" height="16" /> Fitment verified to your car
          </li>
        </ul>
        <div className="preowned-cta">
          <button className="btn btn-primary" onClick={browse}>
            Browse pre-owned parts
          </button>
          <span className="preowned-demo">
            Example:{' '}
            <del>{formatINR(sample.mrp)}</del>{' '}
            <strong>{formatINR(sample.price)}</strong>
            {mode === 'preowned'
              ? ' · live in the shop'
              : ' · switch to Pre-owned in sidebar'}
          </span>
        </div>
      </div>
    </Reveal>
  )
}

function BrandsMarquee() {
  const doubled = [...brands, ...brands]
  return (
    <section className="sec">
      <Reveal className="sec-head">
        <div>
          <div className="sec-kicker">Genuine brands</div>
          <h2>OE & OES brand partners</h2>
        </div>
      </Reveal>
      <Reveal delay={100} className="marquee">
        <div className="marquee-track">
          {doubled.map((b, i) => (
            <span className="marquee-item" key={`${b}-${i}`}>
              {b}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      icon: <IconSearch width="22" height="22" />,
      title: 'Find the part',
      text: 'Search by part number or let the fitment finder pick the right lines for your exact car.',
    },
    {
      icon: <IconPackage width="22" height="22" />,
      title: 'Order in minutes',
      text: 'New or pre-owned parts, GST invoice, bulk quantities — checkout in under a minute.',
    },
    {
      icon: <IconTruck width="22" height="22" />,
      title: 'Delivered fast',
      text: 'Metro delivery in 12 hours, nationwide in 24–48 hours. Tracked from warehouse to door.',
    },
  ]
  return (
    <section className="sec">
      <Reveal className="sec-head">
        <div>
          <div className="sec-kicker">How it works</div>
          <h2>From part number to doorstep</h2>
        </div>
      </Reveal>
      <div className="how">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 110}>
            <TiltCard className="how-step card">
              <span className="how-num">0{i + 1}</span>
              <span className="how-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="sec">
      <div className="sec-head">
        <div>
          <div className="sec-kicker">Word on the road</div>
          <h2>Trusted by garages & car owners</h2>
        </div>
      </div>
      <div className="testimonials">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i * 110}>
            <TiltCard as="figure" className="testi card">
              <span className="testi-quote-mark">“</span>
              <blockquote>{t.quote}</blockquote>
              <figcaption>
                <span className="quote-avatar">{t.name.split(' ').map((x) => x[0]).join('')}</span>
                <span>
                  <strong>{t.name}</strong>
                  <em>
                    {t.role} · <IconMapPin width="12" height="12" /> {t.city}
                  </em>
                </span>
              </figcaption>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Perks() {
  const perks = [
    { icon: <IconShield width="20" height="20" />, t: '100% genuine', s: 'Sourced from OE & OES distributors' },
    { icon: <IconTruck width="20" height="20" />, t: '12-hr metro delivery', s: 'Nationwide in 24–48 hours' },
    { icon: <IconClock width="20" height="20" />, t: 'Easy returns', s: 'Wrong or faulty parts, no drama' },
    { icon: <IconGauge width="20" height="20" />, t: 'Fitment guarantee', s: 'Compatibility verified to your VIN' },
  ]
  return (
    <section className="sec">
      <div className="perks">
        {perks.map((p, i) => (
          <Reveal key={p.t} delay={i * 90}>
            <TiltCard className="perk">
              <span className="perk-icon">{p.icon}</span>
              <div>
                <strong>{p.t}</strong>
                <span>{p.s}</span>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function CarBrandsMarquee() {
  const makes = [...new Set(vehicles.map((v) => v.make))]
  const doubled = [...makes, ...makes]
  return (
    <section className="car-brands" aria-label="All car brands we cover">
      <div className="marquee">
        <div className="marquee-track">
          {doubled.map((m, i) => (
            <span className="marquee-item marquee-item-hl" key={`${m}-${i}`}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="container">
      <Hero />
      <CarScene />
      <CarBrandsMarquee />
      <StatsBar />
      <ProductsMarquee />
      <FeaturedParts />
      <PreOwnedStrip />
      <BrandsMarquee />
      <HowItWorks />
      <Testimonials />
      <Perks />
    </div>
  )
}
