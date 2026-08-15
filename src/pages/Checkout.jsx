import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatINR } from '../data'
import { useStore } from '../context/useStore'
import { checkout, completePayment, verifyPayment } from '../lib/api'
import { loadRazorpayScript, openRazorpayCheckout } from '../lib/payments'
import { getCategory } from '../data'
import ProductArt from '../components/ProductArt'
import {
  IconArrowRight,
  IconCheck,
  IconLock,
  IconShield,
  IconTag,
  IconTruck,
} from '../components/icons'

const FREE_DELIVERY = 1999
const DELIVERY_FEE = 149

const METHODS = [
  { id: 'upi', label: 'UPI', hint: 'GPay · PhonePe · Paytm' },
  { id: 'card', label: 'Card', hint: 'Credit / debit' },
  { id: 'netbanking', label: 'Net Banking', hint: 'All major banks' },
  { id: 'cod', label: 'Cash on Delivery', hint: 'Pay when it arrives' },
]

const BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
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

  const [form, setForm] = useState({
    email: '',
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  })
  const [method, setMethod] = useState('upi')
  const [upiId, setUpiId] = useState('')
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [bank, setBank] = useState(BANKS[0])
  const [errors, setErrors] = useState({})
  const [stage, setStage] = useState('idle') // idle | placing | processing
  const [error, setError] = useState('')

  const prefilled = useRef(false)
  useEffect(() => {
    if (customer && !prefilled.current) {
      setForm((f) => ({
        ...f,
        email: customer.email,
        name: f.name || customer.name,
        phone: f.phone || customer.phone,
      }))
      prefilled.current = true
    }
  }, [customer])

  const delivery = subtotal >= FREE_DELIVERY ? 0 : DELIVERY_FEE
  const total = subtotal + delivery

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Full name is required'
    if (!/^\d{10}$/.test(form.phone.trim())) e.phone = '10-digit mobile number'
    if (form.line1.trim().length < 3) e.line1 = 'Address line is required'
    if (form.city.trim().length < 2) e.city = 'City is required'
    if (form.state.trim().length < 2) e.state = 'State is required'
    if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = '6-digit PIN code'
    if (method === 'upi' && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upiId.trim())) {
      e.upi = 'Enter a UPI ID like name@upi'
    }
    if (method === 'card') {
      if (!/^[\d\s]{16,19}$/.test(card.number.trim())) e.cardNumber = 'Enter card number'
      if (card.name.trim().length < 2) e.cardName = 'Name on card'
      if (!/^\d{2}\/\d{2}$/.test(card.expiry.trim())) e.cardExpiry = 'MM/YY'
      if (!/^\d{3,4}$/.test(card.cvv.trim())) e.cardCvv = 'CVV'
    }
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
    if (!validate()) {
      setError('Please fix the highlighted fields')
      return
    }
    setError('')
    setStage('placing')
    try {
      const result = await checkout(
        {
          mode,
          email: form.email.trim(),
          name: form.name.trim(),
          phone: form.phone.trim(),
          paymentMethod: method,
          address: {
            line1: form.line1.trim(),
            line2: form.line2.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
          },
          cart: cartPayload(),
        },
        token,
      )
      const order = result.order
      rememberOrder(order.email, order.id, order.token)

      if (method === 'cod') {
        clearCart()
        showToast('Order placed — pay on delivery')
        navigate(`/order/${order.id}?token=${order.token}`)
        return
      }

      const intent = result.paymentIntent || {}
      if (intent.provider === 'razorpay') {
        setStage('paying')
        await loadRazorpayScript()
        const { response, failed } = await openRazorpayCheckout({
          intent,
          order,
        })
        if (response) {
          try {
            await verifyPayment(order.id, order.token, response)
            clearCart()
            showToast('Payment successful')
            navigate(`/order/${order.id}?token=${order.token}`)
          } catch (err) {
            setError(err.message || 'Payment could not be confirmed. Your order is saved — try paying again from the order page.')
            setStage('idle')
          }
        } else if (failed) {
          setError('Payment failed. Your order is saved — you can retry from the order page.')
          setStage('idle')
        } else {
          setStage('idle')
          navigate(`/order/${order.id}?token=${order.token}`, { state: { paymentSkipped: true } })
        }
        return
      }

      setStage('processing')
      await sleep(2200) // simulated sandbox gateway
      await completePayment(order.id, order.token, method)
      clearCart()
      showToast('Payment successful')
      navigate(`/order/${order.id}?token=${order.token}`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setStage('idle')
    }
  }

  const busy = stage !== 'idle'

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <IconArrowRight width="13" height="13" />
        <Link to="/shop">Shop</Link>
        <IconArrowRight width="13" height="13" />
        <span>Checkout</span>
      </nav>

      <div className="checkout-head">
        <h1>Checkout</h1>
        <p className="checkout-sub">
          Secure checkout · {mode === 'preowned' ? 'Pre-owned parts' : 'Retail parts'}
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
          <h3>Log in or create an account to place this order</h3>
          <p>
            Browse freely — you only need an account when you buy. Sign in once and your
            orders, invoices and tracking stay in one place.
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
        <form className="checkout" onSubmit={submit}>
          <div className="checkout-main">
            <section className="checkout-card card">
              <h2>1 · Contact details</h2>
              <div className="co-grid">
                <label className="co-field co-span2">
                  <span>Signed in as</span>
                  <div className="co-email-readonly">
                    <IconCheck width="15" height="15" />
                    <span>{form.email}</span>
                  </div>
                </label>
                <label className="co-field">
                  <span>Full name</span>
                  <input className="input" placeholder="Name" value={form.name} onChange={set('name')} />
                  {errors.name && <em className="co-err">{errors.name}</em>}
                </label>
                <label className="co-field">
                  <span>Mobile number</span>
                  <input className="input" inputMode="numeric" placeholder="10-digit mobile" value={form.phone} onChange={set('phone')} />
                  {errors.phone && <em className="co-err">{errors.phone}</em>}
                </label>
              </div>
            </section>

            <section className="checkout-card card">
              <h2>2 · Delivery address</h2>
              <div className="co-grid">
                <label className="co-field co-span2">
                  <span>Address line 1</span>
                  <input className="input" placeholder="Shop / house no, street" value={form.line1} onChange={set('line1')} />
                  {errors.line1 && <em className="co-err">{errors.line1}</em>}
                </label>
                <label className="co-field co-span2">
                  <span>Address line 2 (optional)</span>
                  <input className="input" placeholder="Landmark, area" value={form.line2} onChange={set('line2')} />
                </label>
                <label className="co-field">
                  <span>City</span>
                  <input className="input" placeholder="City" value={form.city} onChange={set('city')} />
                  {errors.city && <em className="co-err">{errors.city}</em>}
                </label>
                <label className="co-field">
                  <span>State</span>
                  <input className="input" placeholder="State" value={form.state} onChange={set('state')} />
                  {errors.state && <em className="co-err">{errors.state}</em>}
                </label>
                <label className="co-field">
                  <span>PIN code</span>
                  <input className="input" inputMode="numeric" placeholder="411001" value={form.pincode} onChange={set('pincode')} />
                  {errors.pincode && <em className="co-err">{errors.pincode}</em>}
                </label>
              </div>
            </section>

            <section className="checkout-card card">
              <h2>3 · Payment method</h2>
              <div className="pay-methods">
                {METHODS.map((m) => (
                  <label key={m.id} className={`pay-method ${method === m.id ? 'pay-method-on' : ''}`}>
                    <input
                      type="radio"
                      name="method"
                      checked={method === m.id}
                      onChange={() => setMethod(m.id)}
                    />
                    <span className="pay-method-label">{m.label}</span>
                    <span className="pay-method-hint">{m.hint}</span>
                    {method === m.id && <IconCheck className="pay-method-check" width="16" height="16" />}
                  </label>
                ))}
              </div>

              {method === 'upi' && (
                <div className="pay-fields">
                  <label className="co-field co-span2">
                    <span>UPI ID</span>
                    <input className="input" placeholder="yourname@okhdfcbank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                    {errors.upi && <em className="co-err">{errors.upi}</em>}
                  </label>
                </div>
              )}

              {method === 'card' && (
                <div className="pay-fields">
                  <label className="co-field co-span2">
                    <span>Card number</span>
                    <input className="input" placeholder="4111 1111 1111 1111" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
                    {errors.cardNumber && <em className="co-err">{errors.cardNumber}</em>}
                  </label>
                  <label className="co-field co-span2">
                    <span>Name on card</span>
                    <input className="input" placeholder="Name as printed" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                    {errors.cardName && <em className="co-err">{errors.cardName}</em>}
                  </label>
                  <label className="co-field">
                    <span>Expiry</span>
                    <input className="input" placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                    {errors.cardExpiry && <em className="co-err">{errors.cardExpiry}</em>}
                  </label>
                  <label className="co-field">
                    <span>CVV</span>
                    <input className="input" type="password" inputMode="numeric" placeholder="•••" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
                    {errors.cardCvv && <em className="co-err">{errors.cardCvv}</em>}
                  </label>
                </div>
              )}

              {method === 'netbanking' && (
                <div className="pay-fields">
                  <label className="co-field co-span2">
                    <span>Bank</span>
                    <select className="select" value={bank} onChange={(e) => setBank(e.target.value)}>
                      {BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {method === 'cod' && (
                <p className="cod-note">
                  <IconTruck width="16" height="16" /> Pay {formatINR(total)} in cash when your order arrives.
                </p>
              )}

              <p className="sandbox-note">
                <IconLock width="13" height="13" /> Payments run through the Razorpay test gateway when keys are configured —
                otherwise the built-in sandbox simulates cards, UPI and net banking.
              </p>
            </section>
          </div>

          <aside className="checkout-side">
            <div className="co-summary card">
              <h2>Order summary</h2>
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
                        <span>{product.partNo} · Qty {qty}</span>
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
                    <span>You save</span>
                    <span>{formatINR(savings)}</span>
                  </div>
                )}
                <div className="co-row">
                  <span>Delivery</span>
                  <span>
                    {delivery === 0 ? (
                      <em className="co-free">FREE</em>
                    ) : (
                      formatINR(delivery)
                    )}
                  </span>
                </div>
                <div className="co-row co-row-total">
                  <span>Total</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {stage === 'placing' ? 'Placing order…' : stage === 'processing' ? 'Confirming payment…' : stage === 'paying' ? 'Awaiting payment…' : (
                  <>
                    {method === 'cod' ? 'Place order · pay on delivery' : `Pay ${formatINR(total)}`}
                    <IconArrowRight width="16" height="16" />
                  </>
                )}
              </button>
              {error && <p className="co-error">{error}</p>}
              <div className="co-perks">
                <span><IconShield width="14" height="14" /> 100% genuine</span>
                <span><IconTruck width="14" height="14" /> 12-hr metro delivery</span>
                <span><IconTag width="14" height="14" /> GST invoice</span>
              </div>
            </div>
          </aside>
        </form>
      )}

      {busy && stage !== 'paying' && (
        <div className="pay-overlay">
          <div className="pay-card card">
            <span className="spinner" />
            <h3>
              {stage === 'placing'
                ? 'Securing your order…'
                : 'Processing payment…'}
            </h3>
            <p>
              {stage === 'placing'
                ? 'Reserving stock and preparing your invoice.'
                : 'Do not close this window. Confirming with the gateway.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
