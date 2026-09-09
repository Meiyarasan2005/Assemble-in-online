import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatINR } from '../data'
import { fetchOrders } from '../lib/api'
import { useStore } from '../context/useStore'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconSearch,
  IconTruck,
} from '../components/icons'

const STATUS_TEXT = {
  pending: 'Awaiting payment',
  confirmed: 'Confirmed · being packed',
  shipped: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function statusBadge(status) {
  switch (status) {
    case 'delivered':
      return 'badge-stock'
    case 'shipped':
      return 'badge-new'
    case 'confirmed':
      return 'badge-top'
    case 'pending':
      return 'badge-low'
    default:
      return 'badge-sale'
  }
}

function rememberedEmails() {
  try {
    const map = JSON.parse(localStorage.getItem('meispare-orders') || '{}')
    return Object.keys(map)
  } catch {
    return []
  }
}

export default function Orders() {
  const navigate = useNavigate()
  const { token, customer } = useStore()
  const [email, setEmail] = useState('')
  const [orders, setOrders] = useState(null)
  const [state, setState] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState('')

  const load = useCallback(
    async (addr) => {
      setState('loading')
      setError('')
      try {
        const list = await fetchOrders(addr, token)
        setOrders(list)
        setState('ready')
      } catch (err) {
        setError(err.message || 'Could not load orders')
        setOrders(null)
        setState('error')
      }
    },
    [token],
  )

  useEffect(() => {
    const remembered = rememberedEmails()
    const initial = customer?.email || (remembered.length ? remembered[0] : '')
    if (initial) {
      setEmail(initial)
      load(initial)
    }
  }, [customer, load])

  const submit = (e) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Enter a valid email')
      return
    }
    load(email.trim())
  }

  return (
    <div className="container">
      <button className="pd-back" onClick={() => navigate(-1)}>
        <IconArrowLeft width="18" height="18" /> Back
      </button>

      <div className="orders-head">
        <h1>My orders</h1>
        <p>{customer ? `Showing orders for ${customer.email}.` : 'Track every order placed on this email address.'}</p>
      </div>

      {!customer && (
        <form className="orders-search card" onSubmit={submit}>
          <IconSearch width="18" height="18" />
          <input
            className="orders-input"
            type="email"
            placeholder="Enter the email used at checkout — e.g. you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Order email"
          />
          <button className="btn btn-primary" type="submit">
            Find orders
          </button>
        </form>
      )}

      {state === 'loading' && (
        <div className="co-loading" style={{ padding: '48px 0' }}>
          <span className="spinner" />
          <p>Loading orders…</p>
        </div>
      )}

      {state === 'error' && (
        <div className="empty-state card" style={{ marginTop: 24 }}>
          <h3>Could not load orders</h3>
          <p>{error}</p>
        </div>
      )}

      {state === 'ready' && orders.length === 0 && (
        <div className="empty-state card" style={{ marginTop: 24 }}>
          <IconSearch width="40" height="40" />
          <h3>No orders found</h3>
          <p>We couldn't find any orders for that email address.</p>
          <Link to="/shop" className="btn btn-primary">
            Start shopping
          </Link>
        </div>
      )}

      {state === 'ready' && orders.length > 0 && (
        <div className="orders-list">
          {orders.map((o) => (
            <div key={o.id} className="order-card card">
              <div className="order-card-head">
                <div>
                  <span className="order-id">{o.id}</span>
                  <span className={`badge ${statusBadge(o.status)}`}>
                    {STATUS_TEXT[o.status] || o.status}
                  </span>
                </div>
                <span className="order-date">
                  {new Date(o.createdAt).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="order-card-body">
                <div className="order-card-items">
                  {o.items.slice(0, 3).map((i) => (
                    <div key={i.productId} className="order-card-item">
                      <span>{i.name}</span>
                      <em>× {i.qty}</em>
                    </div>
                  ))}
                  {o.items.length > 3 && (
                    <span className="order-more">+{o.items.length - 3} more</span>
                  )}
                </div>

                <div className="order-card-total">
                  <span>Total</span>
                  <strong>{formatINR(o.total)}</strong>
                </div>

                <div className="order-card-cta">
                  <span className="order-pay">
                    {o.paymentStatus === 'paid' ? (
                      <span className="order-paid"><IconCheck width="14" height="14" /> Paid</span>
                    ) : o.paymentStatus === 'cod' ? (
                      <span><IconTruck width="14" height="14" /> COD</span>
                    ) : (
                      <span><IconClock width="14" height="14" /> {o.paymentStatus}</span>
                    )}
                  </span>
                  <Link to={`/order/${o.id}?token=${o.token}`} className="btn btn-sm btn-primary">
                    Track order <IconArrowRight width="14" height="14" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
