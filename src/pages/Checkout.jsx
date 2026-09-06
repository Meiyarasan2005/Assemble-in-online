import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatINR } from '../data'
import { useStore } from '../context/useStore'
import { checkout } from '../lib/api'
import { getCategory } from '../data'
import ProductArt from '../components/ProductArt'
import {
  IconArrowRight,
  IconCheck,
  IconLock,
  IconShield,
  IconTag,
  IconTruck,
  IconPackage,
} from '../components/icons'

const FREE_DELIVERY = 1999
const DELIVERY_FEE = 149

const PIN_STATE = {
  '110': 'Delhi', '400': 'Maharashtra', '411': 'Maharashtra', '560': 'Karnataka',
  '500': 'Telangana', '600': 'Tamil Nadu', '641': 'Tamil Nadu', '410': 'Maharashtra',
  '700': 'West Bengal', '302': 'Rajasthan', '380': 'Gujarat', '421': 'Maharashtra',
  '226': 'Uttar Pradesh', '520': 'Andhra Pradesh', '462': 'Madhya Pradesh',
  '360': 'Gujarat', '682': 'Kerala', '695': 'Kerala', '800': 'Bihar',
  '201': 'Uttar Pradesh', '208': 'Uttar Pradesh', '211': 'Uttar Pradesh',
  '395': 'Gujarat', '422': 'Tamil Nadu', '431': 'Tamil Nadu', '440': 'Maharashtra',
  '530': 'Andhra Pradesh', '575': 'Karnataka', '576': 'Karnataka',
  '625': 'Tamil Nadu', '683': 'Kerala',
  '721': 'West Bengal', '751': 'Odisha', '781': 'Assam',
}

function pinToState(pin) {
  const p = pin.replace(/\D/g, '')
  if (p.length < 3) return ''
  return PIN_STATE[p.slice(0, 3)] || ''
}

function normPhone(raw) {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

function rememberOrder(email, orderId, token) {
  try {
    const raw = localStorage.getItem('meispare-orders')
    const map = raw ? JSON.parse(raw) : {}
    map[email] = map[email] || []
    if (!map[email].some((o) => o.id === orderId)) {
      map[email].push({ id: orderId, token })
    }
    localStorage.setItem('meispare-orders', JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export default function Checkout() {
  const navigate = useNavigate()
  const { mode, lines, subtotal, savings, clearCart, showToast, isAuthed, authReady, customer, token } = useStore()

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [stage, setStage] = useState('idle')
  const [error, setError] = useState('')

  const delivery = subtotal >= FREE_DELIVERY ? 0 : DELIVERY_FEE
  const total = subtotal + delivery

  const markTouched = (key) => () => setTouched((t) => ({ ...t, [key]: true }))

  const handlePincodeBlur = (e) => {
    markTouched('pincode')(e)
    const st = pinToState(e.target.value)
    if (st) {
      const stateInput = e.target.form.elements.namedItem('co-state')
      if (stateInput && !String(stateInput.value ?? '').trim()) {
        stateInput.value = st
      }
      setTouched((t) => ({ ...t, state: true }))
    }
  }

  const readValues = (el) => {
    const get = (n) => {
      const f = el.elements.namedItem(n)
      return f ? String(f.value ?? '').trim() : ''
    }
    const pincode = get('co-pincode')
    return {
      email: customer?.email || '',
      name: get('co-name'),
      phone: normPhone(get('co-phone')),
      line1: get('co-line1'),
      line2: get('co-line2'),
      location: get('co-location'),
      city: get('co-city'),
      state: get('co-state') || pinToState(pincode),
      pincode,
    }
  }

  const validate = (v) => {
    const e = {}
    if (v.name.trim().length < 2) e.name = 'Please enter your full name'
    if (!/^\d{10}$/.test(v.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number'
    if (v.line1.trim().length < 3) e.line1 = 'Please enter your delivery address'
    if (v.city.trim().length < 2) e.city = 'Please enter your city'
    if (v.state.trim().length < 2) e.state = 'Please select your state'
    if (!/^\d{6}$/.test(v.pincode.trim())) e.pincode = 'Enter a valid 6-digit PIN code'
    if (v.location.trim().length < 2) e.location = 'Please enter your location / area'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const cartPayload = () =>
    lines.map((l) => ({ id: l.product.id, qty: l.qty }))

  const submit = async (ev) => {
    ev.preventDefault()
    if (lines.length === 0) {
      setError('Your cart is empty')
      return
    }
    const v = readValues(ev.currentTarget)
    setTouched({ name: true, phone: true, line1: true, city: true, state: true, pincode: true, location: true })
    validate(v)
    setError('')
    setStage('placing')
    try {
      const result = await checkout(
        {
          mode,
          email: v.email,
          name: v.name,
          phone: v.phone,
          paymentMethod: 'cod',
          address: {
            line1: v.line1,
            line2: v.line2,
            location: v.location,
            city: v.city,
            state: v.state,
            pincode: v.pincode,
          },
          cart: cartPayload(),
        },
        token,
      )
      const order = result.order
      rememberOrder(order.email, order.id, order.token)
      clearCart()
      showToast('Order placed successfully!')
      navigate(`/order/${order.id}?token=${order.token}`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setStage('idle')
    }
  }

  const busy = stage !== 'idle'

  return (
    <div className="container">
      <div className="checkout-head">
        <h1>Checkout</h1>
        <p className="checkout-sub">
          {mode === 'preowned' ? 'Pre-owned parts' : 'Retail parts'} · Cash on Delivery · Delivering across India
        </p>
      </div>

      {!authReady ? (
        <div className="co-loading" style={{ padding: '48px 0' }}>
          <span className="spinner" />
          <p>Checking your account…</p>
        </div>
      ) : lines.length === 0 && stage === 'idle' ? (
        <div className="empty-state card" style={{ marginTop: 24 }}>
          <h3>Your cart is empty</h3>
          <p>Add some genuine parts before checking out.</p>
          <Link to="/shop" className="btn btn-primary">
            Browse parts
          </Link>
        </div>
      ) : !isAuthed ? (
        <div className="empty-state card auth-gate" style={{ marginTop: 24 }}>
          <div className="auth-gate-ic">
            <IconLock width="26" height="26" />
          </div>
          <h3>Log in to place your order</h3>
          <p>
            Sign in once and your orders, invoices and tracking stay in one place.
          </p>
          <div className="auth-gate-actions">
            <Link to="/account?next=/checkout" className="btn btn-primary btn-sm">
              Log in / Create account <IconArrowRight width="16" height="16" />
            </Link>
            <Link to="/shop" className="btn btn-ghost btn-sm">
              Keep shopping
            </Link>
          </div>
        </div>
      ) : (
        <form className="checkout" onSubmit={submit} noValidate>
          <div className="checkout-main">
            <section className="checkout-card card">
              <h2>1 · Delivery address</h2>
              <div className="co-grid">
                <label className="co-field co-span2">
                  <span>Full name</span>
                  <input
                    name="co-name"
                    autoComplete="name"
                    className={`input ${touched.name && errors.name ? 'input-err' : ''}`}
                    placeholder="Enter full name"
                    defaultValue={customer?.name || ''}
                    onBlur={markTouched('name')}
                  />
                  {touched.name && errors.name && <em className="co-err">{errors.name}</em>}
                </label>
                <label className="co-field">
                  <span>Mobile number</span>
                  <input
                    name="co-phone"
                    autoComplete="tel"
                    className={`input ${touched.phone && errors.phone ? 'input-err' : ''}`}
                    inputMode="tel"
                    placeholder="10-digit mobile number"
                    defaultValue={customer?.phone || ''}
                    onBlur={markTouched('phone')}
                    maxLength={15}
                  />
                  {touched.phone && errors.phone && <em className="co-err">{errors.phone}</em>}
                </label>
                <label className="co-field">
                  <span>PIN code</span>
                  <input
                    name="co-pincode"
                    autoComplete="postal-code"
                    className={`input ${touched.pincode && errors.pincode ? 'input-err' : ''}`}
                    inputMode="numeric"
                    placeholder="6-digit PIN code"
                    onBlur={handlePincodeBlur}
                    maxLength={6}
                  />
                  {touched.pincode && errors.pincode && <em className="co-err">{errors.pincode}</em>}
                </label>
                <label className="co-field co-span2">
                  <span>Address (Area and Street)</span>
                  <input
                    name="co-line1"
                    autoComplete="address-line1"
                    className={`input ${touched.line1 && errors.line1 ? 'input-err' : ''}`}
                    placeholder="House no, building, street, area"
                    onBlur={markTouched('line1')}
                  />
                  {touched.line1 && errors.line1 && <em className="co-err">{errors.line1}</em>}
                </label>
                <label className="co-field co-span2">
                  <span>Location / Area</span>
                  <input
                    name="co-location"
                    className={`input ${touched.location && errors.location ? 'input-err' : ''}`}
                    placeholder="E.g. Gandhipuram, Peelamedu, RS Puram"
                    onBlur={markTouched('location')}
                  />
                  {touched.location && errors.location && <em className="co-err">{errors.location}</em>}
                </label>
                <label className="co-field co-span2">
                  <span>Landmark (optional)</span>
                  <input
                    name="co-line2"
                    className="input"
                    placeholder="E.g. near HDFC bank, opposite park"
                  />
                </label>
                <label className="co-field">
                  <span>City</span>
                  <input
                    name="co-city"
                    autoComplete="address-level2"
                    className={`input ${touched.city && errors.city ? 'input-err' : ''}`}
                    placeholder="City"
                    onBlur={markTouched('city')}
                  />
                  {touched.city && errors.city && <em className="co-err">{errors.city}</em>}
                </label>
                <label className="co-field">
                  <span>State</span>
                  <input
                    name="co-state"
                    autoComplete="address-level1"
                    className={`input ${touched.state && errors.state ? 'input-err' : ''}`}
                    placeholder="State"
                    onBlur={markTouched('state')}
                  />
                  {touched.state && errors.state && <em className="co-err">{errors.state}</em>}
                </label>
              </div>
              <div className="co-delivery-est">
                <IconTruck width="16" height="16" />
                <span>Delivery by {subtotal >= FREE_DELIVERY ? 'tomorrow' : '2–4 business days'} · {delivery === 0 ? 'FREE delivery' : `₹${DELIVERY_FEE} delivery charge`}</span>
              </div>
            </section>

            <section className="checkout-card card">
              <h2>2 · Payment — Cash on Delivery</h2>
              <div className="cod-info">
                <div className="cod-row">
                  <IconPackage width="18" height="18" />
                  <div>
                    <strong>Pay ₹{formatINR(total).replace('₹', '')} when delivered</strong>
                    <span>No advance payment needed — cash at your doorstep</span>
                  </div>
                </div>
                <div className="cod-row">
                  <IconShield width="18" height="18" />
                  <div>
                    <strong>100% Genuine parts guaranteed</strong>
                    <span>Inspect before payment — no questions asked</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="co-trust-strip">
              <span><IconShield width="14" height="14" /> 100% Genuine</span>
              <span><IconTruck width="14" height="14" /> Fast Delivery</span>
              <span><IconTag width="14" height="14" /> GST Invoice</span>
              <span><IconCheck width="14" height="14" /> Pay on Delivery</span>
            </div>
          </div>

          <aside className="checkout-side">
            <div className="co-summary card">
              <h2>Order summary ({lines.length} {lines.length === 1 ? 'item' : 'items'})</h2>
              <ul className="co-items">
                {lines.map(({ product, qty, price }) => {
                  const cat = getCategory(product.category)
                  return (
                    <li key={product.id} className="co-item">
                      <span className={`co-art co-art-${cat.id}`}>
                        <ProductArt category={cat.icon} />
                      </span>
                      <div className="co-item-info">
                        <strong>{product.name}</strong>
                        <span>{product.partNo} · Qty: {qty}</span>
                      </div>
                      <em>{formatINR(price * qty)}</em>
                    </li>
                  )
                })}
              </ul>
              <div className="co-rows">
                <div className="co-row">
                  <span>Subtotal</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                {savings > 0 && (
                  <div className="co-row co-row-good">
                    <span>Total savings</span>
                    <span>- {formatINR(savings)}</span>
                  </div>
                )}
                <div className="co-row">
                  <span>Delivery charge</span>
                  <span>
                    {delivery === 0 ? (
                      <em className="co-free">FREE</em>
                    ) : (
                      formatINR(delivery)
                    )}
                  </span>
                </div>
                <div className="co-row co-row-total">
                  <span>Total payable on delivery</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>
              {savings > 0 && (
                <div className="co-savings-badge">
                  You are saving {formatINR(savings)} on this order!
                </div>
              )}
              <button className="btn btn-primary btn-block co-cta" type="submit" disabled={busy}>
                {stage === 'placing' ? (
                  'Placing your order…'
                ) : (
                  <>
                    Place Order
                    <IconArrowRight width="16" height="16" />
                  </>
                )}
              </button>
              {error && <p className="co-error">{error}</p>}
              <p className="co-safe-note">
                <IconLock width="12" height="12" /> Cash on Delivery · Pay only when your parts arrive
              </p>
            </div>
          </aside>
        </form>
      )}

      {busy && (
        <div className="pay-overlay">
          <div className="pay-card card">
            <span className="spinner" />
            <h3>Placing your order…</h3>
            <p>Reserving stock and preparing your order.</p>
          </div>
        </div>
      )}
    </div>
  )
}