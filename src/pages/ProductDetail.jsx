import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatINR, getCategory, getProduct, interchangesFor } from '../data'
import { useStore } from '../context/useStore'
import useCatalog from '../hooks/useCatalog'
import ProductArt from '../components/ProductArt'
import ProductCard from '../components/ProductCard'
import FitmentWizard from '../components/FitmentWizard'
import PartLookup from '../components/PartLookup'
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconHeart,
  IconMinus,
  IconPlus,
  IconRotateCw,
  IconShield,
  IconStar,
  IconTruck,
  IconTag,
} from '../components/icons'

const DELIVERY = [
  { city: 'Pune', time: 'Today · by 8 pm' },
  { city: 'Mumbai / Bengaluru / Delhi NCR', time: 'Tomorrow · by 1 pm' },
  { city: 'Rest of India', time: '24–48 hrs' },
]

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart, wishlist, toggleWishlist } = useStore()
  const { products, vehicles } = useCatalog()
  const [qty, setQty] = useState(1)
  const [artSpin, setArtSpin] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%')
  const artWrapRef = useRef(null)

  const product = products.find((p) => p.id === id) || getProduct(id)

  if (!product) {
    return (
      <div className="container empty-state card" style={{ marginTop: 40 }}>
        <h3>Part not found</h3>
        <p>The part you are looking for doesn't exist or was removed.</p>
        <Link to="/shop" className="btn btn-primary">
          Back to shop
        </Link>
      </div>
    )
  }

  const cat = getCategory(product.category)
  const pre = Boolean(product.condition)
  const shown = product.price
  const save = product.mrp - shown
  const out = product.stock === 0
  const wished = wishlist.includes(product.id)
  const xrefs = interchangesFor(product.partNo)
  const fitCars = vehicles.filter((v) => product.fits.includes(v.id))
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  const specs = [
    ['Part number', product.partNo],
    ['Brand', product.brand],
    ['Category', cat.name],
    [
      'Condition',
      pre ? `${product.condition} · ${product.km} · ${product.age}` : 'Brand new · genuine',
    ],
    ['Packaging', pre ? 'Tested & re-certified' : 'OEM sealed'],
    ['Warranty', pre ? '3 months' : '6 months'],
  ]

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <IconArrowRight width="13" height="13" />
        <Link to="/shop">All parts</Link>
        <IconArrowRight width="13" height="13" />
        <Link to={`/shop?cat=${cat.id}`}>{cat.name}</Link>
        <IconArrowRight width="13" height="13" />
        <span>{product.name}</span>
      </nav>

      <div className="pd">
        <div className="pd-art-col">
          <div
            ref={artWrapRef}
            className={`pd-art card pd-art-${cat.id} ${artSpin ? 'pd-art-spin' : ''}`}
            onMouseMove={(e) => {
              const r = artWrapRef.current?.getBoundingClientRect()
              if (!r) return
              const x = ((e.clientX - r.left) / r.width) * 100
              const y = ((e.clientY - r.top) / r.height) * 100
              setZoomOrigin(`${x}% ${y}%`)
            }}
          >
            <div className="pd-art-zoom" style={{ transformOrigin: zoomOrigin }}>
              <ProductArt category={cat.icon} />
            </div>
            <div className="pd-art-tools">
              <button
                type="button"
                className={`pd-art-tool ${artSpin ? 'is-on' : ''}`}
                onClick={() => setArtSpin((s) => !s)}
                title="Rotate 360°"
              >
                <IconRotateCw width="16" height="16" /> 360°
              </button>
              <span className="pd-art-hint">Hover to zoom</span>
            </div>
          </div>
          <div className="pd-art-minis">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`pd-art-mini card pd-art-${cat.id} ${i === 0 ? 'pd-art-mini-on' : ''}`}>
                <ProductArt category={cat.icon} />
              </div>
            ))}
          </div>
        </div>

        <div className="pd-info">
          <div className="pd-topline">
            <span className="badge">{cat.short}</span>
            <span className={`badge ${product.badge === 'low' ? 'badge-low' : product.badge === 'top' ? 'badge-top' : product.badge === 'new' ? 'badge-new' : ''}`}>
              {product.badge === 'low' ? 'Few left' : product.badge === 'top' ? 'Best seller' : product.badge === 'new' ? 'New' : pre ? product.condition : 'Genuine'}
            </span>
            <span className={`badge ${product.stock > 0 ? 'badge-stock' : 'badge-low'}`}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </span>
            {pre && <span className="badge badge-pre">Certified pre-owned</span>}
          </div>

          <h1 className="pd-title">{product.name}</h1>

          <div className="pd-meta">
            <span className="pd-partno">
              Part no · <strong>{product.partNo}</strong>
            </span>
            <span className="pd-rating">
              <IconStar className="star" /> {product.rating}
              <span className="pd-reviews">({product.reviews} verified reviews)</span>
            </span>
          </div>

          {xrefs.length > 0 && (
            <div className="pd-xref">
              <span className="pd-xref-label">Also known as</span>
              <div className="pd-xref-chips">
                {xrefs.map((x) => (
                  <button
                    key={x.oem}
                    type="button"
                    className="xref-chip"
                    onClick={() => navigate(`/product/${product.id}?lookup=1`)}
                  >
                    {x.oem} <em>{x.brand}</em>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pd-priceblock card">
            <div className="pd-price-row">
              {pre && (
                <span className="pd-pre-badge">
                  <IconTag width="13" height="13" /> Certified pre-owned
                </span>
              )}
              <div className="pd-price">
                {formatINR(shown)}
                {pre ? (
                  <span className="pd-price-sub">
                    Pre-owned ({product.condition} · {product.km})
                  </span>
                ) : (
                  <span className="pd-price-sub">Incl. of all taxes</span>
                )}
              </div>
              <span className="pd-mrp">
                {pre ? 'New' : 'MRP'} <del>{formatINR(product.mrp)}</del>
              </span>
              {save > 0 && <span className="pd-save">You save {formatINR(save)}</span>}
            </div>

            <div className="pd-buy">
              <div className="qty-stepper">
                <button
                  className="qty-btn"
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  <IconMinus width="15" height="15" />
                </button>
                <span className="qty-val">{qty}</span>
                <button
                  className="qty-btn"
                  onClick={() => setQty((n) => n + 1)}
                  aria-label="Increase quantity"
                >
                  <IconPlus width="15" height="15" />
                </button>
              </div>
              <button
                className="btn btn-primary pd-add"
                disabled={out}
                onClick={() => addToCart(product.id, qty)}
              >
                {out ? 'Out of stock' : 'Add to cart'}
              </button>
              <button
                type="button"
                className={`btn pd-wish ${wished ? 'is-wished' : ''}`}
                onClick={() => toggleWishlist(product.id)}
                aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <IconHeart width="16" height="16" />
                {wished ? 'Saved' : 'Save'}
              </button>
            </div>

            <div className="pd-perks">
              <span>
                <IconShield width="15" height="15" />{' '}
                {pre
                  ? 'Certified pre-owned · inspected & tested'
                  : '100% genuine, sourced from OES distributors'}
              </span>
              <span>
                <IconTruck width="15" height="15" /> Free delivery above ₹1,999
              </span>
              <span>
                <IconClock width="15" height="15" /> Easy 7-day returns
              </span>
            </div>
          </div>

          <div className="pd-delivery card">
            <strong>Estimated delivery</strong>
            {DELIVERY.map((d) => (
              <div key={d.city} className="pd-del-row">
                <span>{d.city}</span>
                <em>{d.time}</em>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pd-below">
        <div className="pd-section">
          <h2>About this part</h2>
          <p className="pd-desc">{product.desc}</p>
          <ul className="pd-feats">
            {product.features.map((f) => (
              <li key={f}>
                <IconCheck width="15" height="15" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="pd-section">
          <FitmentWizard product={product} />
        </div>

        <div className="pd-section">
          <h2>Fits these vehicles</h2>
          <ul className="pd-fits">
            {fitCars.map((v) => (
              <li key={v.id} className="card">
                <strong>
                  {v.make} {v.model}
                </strong>
                <span>{v.years} · {v.engine}</span>
              </li>
            ))}
          </ul>
          <p className="pd-fit-note">
            Don't see your car? Verify by VIN during checkout or{' '}
            <button className="link-btn" onClick={() => navigate('/shop?fitment=1')}>
              use the fitment finder
            </button>.
          </p>
        </div>

        <div className="pd-section">
          <h2>Specifications</h2>
          <table className="pd-specs">
            <tbody>
              {specs.map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pd-section">
          <PartLookup />
        </div>
      </div>

      {related.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <div>
              <div className="sec-kicker">More in {cat.name}</div>
              <h2>You may also need</h2>
            </div>
            <Link to={`/shop?cat=${cat.id}`} className="sec-link">
              View all <IconArrowRight width="15" height="15" />
            </Link>
          </div>
          <div className="grid-featured">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
