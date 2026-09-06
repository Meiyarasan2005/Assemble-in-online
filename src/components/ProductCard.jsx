import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatINR, getCategory, vehicles } from '../data'
import { useStore } from '../context/useStore'
import { useSeller } from '../context/useSeller'
import { t } from '../lib/i18n'
import ProductArt from './ProductArt'
import { IconStar } from './icons'

const vehicleById = new Map(vehicles.map((v) => [v.id, v]))

function productThumb(p) {
  if (p && p.image) return p.image
  if (p && p.category) return `/images/${p.category}.jpg`
  return ''
}

function InlineEdit({ value, onSave, type = 'number', className, prefix }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const save = () => {
    setEditing(false)
    const numVal = type === 'number' ? Number(draft) : draft
    if (numVal !== value) onSave(numVal)
  }

  if (!editing) {
    return (
      <span
        className={`${className} seller-inline-edit`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDraft(value); setEditing(true) }}
        title="Click to edit"
      >
        {prefix}{type === 'number' ? Number(value).toLocaleString('en-IN') : value}
        <span className="seller-pencil">&#9998;</span>
      </span>
    )
  }

  return (
    <span className="seller-inline-editor" onClick={(e) => e.preventDefault()}>
      {prefix && <span>{prefix}</span>}
      <input
        className="seller-inline-input"
        type={type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        autoFocus
        min={type === 'number' ? 0 : undefined}
      />
    </span>
  )
}

export default function ProductCard({ product, compact = false }) {
  const { activeVehicle, lang } = useStore()
  const { isSeller, updateProduct } = useSeller()
  const [overrides, setOverrides] = useState({})

  const merge = useCallback((field, val) => {
    setOverrides((prev) => ({ ...prev, [field]: val }))
  }, [])

  const price = overrides.price ?? product.price
  const mrp = overrides.mrp ?? product.mrp
  const stock = overrides.stock ?? product.stock

  const cat = getCategory(product.category)
  const thumb = productThumb(product)
  const pre = Boolean(product.condition)
  const save = mrp - price
  const savePct = mrp > 0 ? Math.round((save / mrp) * 100) : 0
  const fitsActive = activeVehicle && product.fits?.includes(activeVehicle)
  const activeV = vehicleById.get(activeVehicle)

  const handleSave = async (field, val) => {
    try {
      await updateProduct(product.id, { [field]: val })
      merge(field, val)
    } catch { /* ignore */ }
  }

  return (
    <article className={`pcard ${compact ? 'pcard-compact' : ''} ${isSeller ? 'seller-mode' : ''}`}>
      <Link to={`/product/${product.id}`} className="pcard-art-wrap">
        <span className={`pcard-art pcard-art-${cat.id}`}>
          {thumb ? (
            <img src={thumb} alt={product.name} loading="lazy" />
          ) : (
            <ProductArt category={cat.icon} />
          )}
        </span>
        <span className="pcard-badges">
          {product.badge === 'sale' && <span className="badge badge-sale">Sale</span>}
          {product.badge === 'new' && <span className="badge badge-new">New</span>}
          {product.badge === 'top' && <span className="badge badge-top">Best seller</span>}
          {product.badge === 'low' && <span className="badge badge-low">Few left</span>}
          {pre && <span className="badge badge-pre">Pre-owned</span>}
          {isSeller && <span className="badge badge-seller">Editing</span>}
        </span>
      </Link>

      {fitsActive && activeV && (
        <span className="fit-ribbon">{t('fitsYourCar', lang, { v: activeV.model })}</span>
      )}

      <div className="pcard-body">
        <span className="pcard-brand">{product.brand}</span>
        <Link to={`/product/${product.id}`} className="pcard-name">
          {product.name}
        </Link>
        <div className="pcard-rating">
          <span className="pcard-rating-badge">
            {product.rating} <IconStar width="11" height="11" />
          </span>
          <span className="pcard-reviews">({product.reviews})</span>
        </div>
        <div className="pcard-price-row">
          {isSeller ? (
            <InlineEdit value={price} prefix="&#8377;" onSave={(v) => handleSave('price', v)} className="pcard-price" />
          ) : (
            <span className="pcard-price">{formatINR(price)}</span>
          )}
          {save > 0 && (
            <>
              {isSeller ? (
                <InlineEdit value={mrp} prefix="MRP &#8377;" onSave={(v) => handleSave('mrp', v)} className="pcard-mrp" />
              ) : (
                <span className="pcard-mrp">{formatINR(mrp)}</span>
              )}
              <span className="pcard-discount">{savePct}% off</span>
            </>
          )}
        </div>
        {isSeller && (
          <div className="pcard-stock-row">
            <span className="pcard-stock-label">Stock:</span>
            <InlineEdit value={stock} onSave={(v) => handleSave('stock', v)} className="pcard-stock" />
          </div>
        )}
      </div>
    </article>
  )
}
