import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatINR, getCategory, getProduct, interchangesFor, products as allProducts, preownedProducts, reviews as allReviews } from '../data'
import { useStore } from '../context/useStore'
import { useSeller } from '../context/useSeller'
import useCatalog from '../hooks/useCatalog'
import ProductArt from '../components/ProductArt'
import ProductCard from '../components/ProductCard'
import FitmentWizard from '../components/FitmentWizard'
import PartLookup from '../components/PartLookup'
import ReviewSection from '../components/ReviewSection'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconHeart,
  IconMinus,
  IconPlus,
  IconShield,
  IconStar,
  IconTruck,
  IconTag,
} from '../components/icons'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart, wishlist, toggleWishlist } = useStore()
  const { isSeller, updateProduct, uploadImage } = useSeller()
  const { products } = useCatalog()
  const [qty, setQty] = useState(1)
  const [sellerDraft, setSellerDraft] = useState({})
  const [sellerSaving, setSellerSaving] = useState(false)
  const [sellerMsg, setSellerMsg] = useState('')
  const [editImage, setEditImage] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const fileRef = useRef(null)

  const product = products.find((p) => p.id === id) || getProduct(id)

  if (!product) {
    return (
      <div className="pd-notfound">
        <h3>Part not found</h3>
        <p>The part you are looking for doesn't exist or was removed.</p>
        <Link to="/shop" className="btn btn-primary">Back to shop</Link>
      </div>
    )
  }

  const cat = getCategory(product.category)
  const pre = Boolean(product.condition)
  const shown = product.price
  const save = product.mrp - shown
  const savePct = product.mrp > 0 ? Math.round((save / product.mrp) * 100) : 0
  const out = product.stock === 0
  const wished = wishlist.includes(product.id)
  const xrefs = interchangesFor(product.partNo)
  const related = [...allProducts, ...preownedProducts]
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  const productReviews = allReviews[product.id] || []

  const sellerField = (field) => sellerDraft[field] ?? product[field]

  const saveSeller = async () => {
    if (!isSeller || !product) return
    setSellerSaving(true)
    setSellerMsg('')
    try {
      const payload = {}
      if (sellerDraft.price != null) payload.price = Number(sellerDraft.price)
      if (sellerDraft.mrp != null) payload.mrp = Number(sellerDraft.mrp)
      if (sellerDraft.stock != null) payload.stock = Number(sellerDraft.stock)
      if (Object.keys(payload).length === 0) { setSellerMsg('Nothing to save'); setSellerSaving(false); return }
      await updateProduct(product.id, payload)
      Object.assign(product, payload)
      setSellerDraft({})
      setSellerMsg('Saved!')
      setTimeout(() => setSellerMsg(''), 2000)
    } catch (err) {
      setSellerMsg(err.message || 'Save failed')
    } finally {
      setSellerSaving(false)
    }
  }

  const handleImageUpload = async (file) => {
    if (!file || !product) return
    setSellerSaving(true)
    setSellerMsg('')
    try {
      const updated = await uploadImage(product.id, file)
      product.image = updated.image
      setEditImage(false)
      setSellerMsg('Image uploaded!')
      setTimeout(() => setSellerMsg(''), 2000)
    } catch (err) {
      setSellerMsg(err.message || 'Upload failed')
    } finally {
      setSellerSaving(false)
    }
  }

  const handleImageUrl = async () => {
    if (!imageUrl.trim() || !product) return
    setSellerSaving(true)
    setSellerMsg('')
    try {
      await updateProduct(product.id, { image: imageUrl.trim() })
      product.image = imageUrl.trim()
      setImageUrl('')
      setEditImage(false)
      setSellerMsg('Image updated!')
      setTimeout(() => setSellerMsg(''), 2000)
    } catch (err) {
      setSellerMsg(err.message || 'Save failed')
    } finally {
      setSellerSaving(false)
    }
  }

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
      <button className="pd-back" onClick={() => navigate(-1)}>
        <IconArrowLeft width="18" height="18" /> Back
      </button>

      {isSeller && (
        <div className="seller-edit-panel">
          <div className="seller-edit-head">
            <span className="seller-dot" />
            <strong>Seller Mode</strong>
            <span className="seller-edit-sub">Editing: {product.id}</span>
          </div>
          <div className="seller-edit-fields">
            <label className="seller-edit-field">
              <span>Price (&#8377;)</span>
              <input type="number" min="0" value={sellerField('price')} onChange={(e) => setSellerDraft((d) => ({ ...d, price: e.target.value }))} />
            </label>
            <label className="seller-edit-field">
              <span>MRP (&#8377;)</span>
              <input type="number" min="0" value={sellerField('mrp')} onChange={(e) => setSellerDraft((d) => ({ ...d, mrp: e.target.value }))} />
            </label>
            <label className="seller-edit-field">
              <span>Stock</span>
              <input type="number" min="0" value={sellerField('stock')} onChange={(e) => setSellerDraft((d) => ({ ...d, stock: e.target.value }))} />
            </label>
            <div className="seller-edit-actions">
              <button className="btn btn-primary seller-save-btn" onClick={saveSeller} disabled={sellerSaving || Object.keys(sellerDraft).length === 0}>
                {sellerSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn seller-img-btn" onClick={() => setEditImage(!editImage)}>
                {editImage ? 'Cancel Image' : 'Change Image'}
              </button>
            </div>
            {sellerMsg && <span className={`seller-msg ${sellerMsg === 'Saved!' || sellerMsg.includes('uploaded') || sellerMsg.includes('updated') ? 'seller-msg-ok' : ''}`}>{sellerMsg}</span>}
          </div>
          {editImage && (
            <div className="seller-image-editor">
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} />
              <button className="btn" onClick={() => fileRef.current?.click()} disabled={sellerSaving}>
                Upload from device
              </button>
              <span className="seller-or">or paste URL:</span>
              <div className="seller-url-row">
                <input className="seller-url-input" type="url" placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                <button className="btn" onClick={handleImageUrl} disabled={!imageUrl.trim() || sellerSaving}>Set URL</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pd-layout">
        {/* LEFT: Image */}
        <div className="pd-img-col">
          <div className={`pd-img-main pd-art-${cat.id}`}>
            {product.image ? (
              <img src={product.image} alt={product.name} />
            ) : (
              <ProductArt category={cat.icon} />
            )}
          </div>
          <div className="pd-img-thumbs">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`pd-img-thumb pd-art-${cat.id} ${i === 0 ? 'active' : ''}`}>
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <ProductArt category={cat.icon} />
                )}
              </div>
            ))}
          </div>
          <div className="pd-img-desc">
            <h4>Description</h4>
            <p>{product.desc}</p>
            {product.features.length > 0 && (
              <ul>
                {product.features.map((f) => (
                  <li key={f}>
                    <IconCheck width="14" height="14" /> {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="pd-img-actions">
            <button
              className={`pd-action-btn ${wished ? 'is-wished' : ''}`}
              onClick={() => toggleWishlist(product.id)}
            >
              <IconHeart width="16" height="16" />
              {wished ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* RIGHT: Info */}
        <div className="pd-info-col">
          <div className="pd-brand-row">
            <Link to={`/shop?brand=${product.brand}`} className="pd-brand-store">
              Visit {product.brand} store
            </Link>
          </div>

          <h1 className="pd-title">{product.name}</h1>

          <div className="pd-rating-row">
            <span className="pd-rating-badge">
              {product.rating} <IconStar width="12" height="12" />
            </span>
            <span className="pd-rating-text">{product.reviews} ratings</span>
            {pre && (
              <span className="pd-condition-badge">
                <IconTag width="12" height="12" /> Certified pre-owned
              </span>
            )}
          </div>

          <div className="pd-price-section">
            <div className="pd-price-row">
              {save > 0 && <span className="pd-discount">{savePct}% off</span>}
              <span className="pd-price">{formatINR(shown)}</span>
            </div>
            <div className="pd-mrp-row">
              {save > 0 && <span className="pd-mrp">M.R.P.: <del>{formatINR(product.mrp)}</del></span>}
            </div>
            <p className="pd-inclusive">Inclusive of all taxes</p>
          </div>

          <div className="pd-offers-row">
            <span className="pd-offer-tag">Bank Offer</span>
            <span>10% off on HDFC Credit Card EMI</span>
          </div>
          <div className="pd-offers-row">
            <span className="pd-offer-tag">Partner</span>
            <span>Extra ₹500 off on Exchange</span>
          </div>

          <div className="pd-delivery-section">
            <h3>Delivery</h3>
            <div className="pd-del-row">
              <IconTruck width="16" height="16" />
              <div>
                <span className="pd-del-city">Pune</span>
                <span className="pd-del-time">Today, if ordered before 4 PM</span>
              </div>
            </div>
            <div className="pd-del-row">
              <IconTruck width="16" height="16" />
              <div>
                <span className="pd-del-city">Mumbai, Bengaluru, Delhi NCR</span>
                <span className="pd-del-time">Tomorrow</span>
              </div>
            </div>
            <div className="pd-del-row">
              <IconTruck width="16" height="16" />
              <div>
                <span className="pd-del-city">Rest of India</span>
                <span className="pd-del-time">2–3 business days</span>
              </div>
            </div>
          </div>

          <div className="pd-highlights">
            <h3>Highlights</h3>
            <ul>
              {product.features.slice(0, 4).map((f) => (
                <li key={f}>
                  <IconCheck width="14" height="14" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="pd-seller-section">
            <h3>Seller</h3>
            <span className="pd-seller-name">SpareXpress Official</span>
            <div className="pd-seller-meta">
              <span>7 day replacement policy</span>
              <IconArrowRight width="12" height="12" />
            </div>
          </div>

          {xrefs.length > 0 && (
            <div className="pd-xref-section">
              <h3>Also known as (Interchange)</h3>
              <div className="pd-xref-list">
                {xrefs.map((x) => (
                  <span key={x.oem} className="pd-xref-chip">
                    {x.oem} <em>{x.brand}</em>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pd-buy-box">
            <div className="pd-buy-qty">
              <button
                className="pd-qty-btn"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                disabled={qty <= 1}
              >
                <IconMinus width="14" height="14" />
              </button>
              <span className="pd-qty-val">{qty}</span>
              <button
                className="pd-qty-btn"
                onClick={() => setQty((n) => n + 1)}
              >
                <IconPlus width="14" height="14" />
              </button>
            </div>
            <button
              className="btn btn-primary pd-btn-cart"
              disabled={out}
              onClick={() => addToCart(product.id, qty, product)}
            >
              {out ? 'Out of stock' : 'ADD TO CART'}
            </button>
            <button
              className="btn pd-btn-buy"
              disabled={out}
              onClick={() => { addToCart(product.id, qty, product); navigate('/checkout') }}
            >
              BUY NOW
            </button>
          </div>

          <div className="pd-trust-row">
            <div className="pd-trust-item">
              <IconShield width="18" height="18" />
              <span>{pre ? 'Certified pre-owned' : 'Genuine parts'}</span>
            </div>
            <div className="pd-trust-item">
              <IconTruck width="18" height="18" />
              <span>Free delivery above ₹1,999</span>
            </div>
            <div className="pd-trust-item">
              <IconClock width="18" height="18" />
              <span>7-day returns</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pd-below">
        <div className="pd-specs-section">
          <h2>Specifications</h2>
          <table className="pd-specs-table">
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

        <div className="pd-fitment-section">
          <FitmentWizard product={product} />
        </div>

        <div className="pd-lookup-section">
          <PartLookup />
        </div>
      </div>

      <ReviewSection reviews={productReviews} rating={product.rating} />

      {related.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2>Similar Products</h2>
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
