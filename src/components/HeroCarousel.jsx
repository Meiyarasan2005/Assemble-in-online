import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowRight, IconChevronLeft, IconChevronRight } from './icons'

const slides = [
  {
    id: 'braking',
    kicker: 'Brakes & Rotors',
    title: 'Stop with Confidence',
    desc: 'Ceramic pads, ventilated rotors & complete brake kits from Bosch, TVS and FEBI.',
    badge: 'Up to 40% off',
    image: '/images/braking.jpg',
    cat: 'braking',
    cta: 'Shop Brake Parts',
  },
  {
    id: 'filters',
    kicker: 'Filters & Fluids',
    title: 'Fresh Filters, Healthier Engine',
    desc: 'Mann-Filter, Mahle & Bosch air, oil, cabin and fuel filters for every car.',
    badge: 'From ₹299',
    image: '/images/filters.jpg',
    cat: 'filters',
    cta: 'Shop Filters',
  },
  {
    id: 'electrical',
    kicker: 'Electrical & Sensors',
    title: 'Power Up Your Ride',
    desc: 'Exide batteries, Hella LED lighting and sensors for rock-solid starts every time.',
    badge: 'From ₹499',
    image: '/images/electrical.jpg',
    cat: 'electrical',
    cta: 'Shop Electrical',
  },
  {
    id: 'engine',
    kicker: 'Engine Parts',
    title: 'Keep the Heart Beating',
    desc: 'NGK plugs, timing kits, drive belts & clutch kits built to OEM tolerances.',
    badge: 'Genuine parts',
    image: '/images/engine.jpg',
    cat: 'engine',
    cta: 'Shop Engine Parts',
  },
]

export default function HeroCarousel() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const go = useCallback((dir) => {
    setIndex((i) => (i + dir + slides.length) % slides.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => go(1), 5000)
    return () => clearInterval(t)
  }, [go, paused])

  return (
    <section
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="hero-carousel-slide"
            onClick={() => navigate(`/shop?cat=${s.cat}`)}
          >
            {i === index ? <SlideContent s={s} navigate={navigate} /> : null}
            <img className="hero-carousel-img" src={s.image} alt={s.kicker} />
          </div>
        ))}
      </div>

      <button
        className="hero-carousel-arrow hero-arrow-prev"
        onClick={(e) => { e.stopPropagation(); go(-1) }}
        aria-label="Previous slide"
      >
        <IconChevronLeft width="20" height="20" />
      </button>
      <button
        className="hero-carousel-arrow hero-arrow-next"
        onClick={(e) => { e.stopPropagation(); go(1) }}
        aria-label="Next slide"
      >
        <IconChevronRight width="20" height="20" />
      </button>

      <div className="hero-carousel-dots">
        {slides.map((s, i) => (
          <button
            key={s.id}
            className={`hero-dot ${i === index ? 'is-active' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

function SlideContent({ s, navigate }) {
  return (
    <div className="hero-carousel-content">
      <div className="hero-carousel-text">
        <span className="hero-carousel-badge">{s.badge}</span>
        <span className="hero-carousel-kicker">{s.kicker}</span>
        <h1>{s.title}</h1>
        <p>{s.desc}</p>
        <button
          className="btn btn-primary hero-carousel-cta"
          onClick={(e) => { e.stopPropagation(); navigate(`/shop?cat=${s.cat}`) }}
        >
          {s.cta} <IconArrowRight width="14" height="14" />
        </button>
      </div>
    </div>
  )
}
