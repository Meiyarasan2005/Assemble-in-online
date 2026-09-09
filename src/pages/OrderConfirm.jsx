import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { formatINR } from '../data'
import { fetchOrder, cancelOrder } from '../lib/api'
import { downloadInvoice, courierUrl } from '../lib/invoice'
import { getCategory } from '../data'
import ProductArt from '../components/ProductArt'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconDownload,
  IconMapPin,
  IconShield,
  IconTruck,
  IconX,
} from '../components/icons'

const STEPS = ['Order placed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered']

const STATUS_TEXT = {
  pending: 'Awaiting payment',
  confirmed: 'Confirmed · being packed',
  shipped: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function activeStep(order) {
  switch (order.status) {
    case 'pending':
      return 0
    case 'confirmed':
      return 1
    case 'shipped':
      return order.events?.some((e) => e.status === 'out_for_delivery') ? 3 : 2
    case 'delivered':
      return 4
    default:
      return 0
  }
}

function eventState(e) {
  switch (e.status) {
    case 'placed':
      return { label: 'Order placed', icon: 'check' }
    case 'confirmed':
      return { label: 'Order confirmed', icon: 'check' }
    case 'shipped':
      return { label: 'Dispatched · in transit', icon: 'truck' }
    case 'out_for_delivery':
      return { label: 'Out for delivery', icon: 'truck' }
    case 'delivered':
      return { label: 'Delivered', icon: 'check' }
    case 'cancelled':
      return { label: 'Cancelled', icon: 'x' }
    case 'refunded':
      return { label: 'Refund issued', icon: 'check' }
    default:
      return { label: e.status, icon: 'clock' }
  }
}

function fmtDate(s) {
  if (!s) return ''
  return new Date(s).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const METHOD_LABEL = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net banking',
  cod: 'Cash on delivery',
}

export default function OrderConfirm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [order, setOrder] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | error
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const data = await fetchOrder(id, token)
      setOrder(data)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [id, token])

  useEffect(() => {
    load()
  }, [load])

  const onCancel = async () => {
    if (!window.confirm('Cancel this order? Stock will be released.')) return
    setCancelling(true)
    try {
      const data = await cancelOrder(id, token)
      setOrder(data)
    } finally {
      setCancelling(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="container co-loading">
        <span className="spinner" />
        <p>Loading your order…</p>
      </div>
    )
  }

  if (state === 'error' || !order) {
    return (
      <div className="container empty-state card" style={{ marginTop: 40 }}>
        <h3>Order not found</h3>
        <p>Check the link or visit your order history to find this order.</p>
        <Link to="/orders" className="btn btn-primary">
          Track my orders
        </Link>
      </div>
    )
  }

  const step = activeStep(order)
  const cancelled = order.status === 'cancelled'
  const cancelable = !cancelled && ['pending', 'confirmed'].includes(order.status)

  return (
    <div className="container">
      <button className="pd-back" onClick={() => navigate(-1)}>
        <IconArrowLeft width="18" height="18" /> Back
      </button>

      <div className="co-confirm card">
        <div className={`co-confirm-badge ${cancelled ? 'co-confirm-bad' : ''}`}>
          {cancelled ? <IconX width="30" height="30" /> : <IconCheck width="30" height="30" />}
        </div>
        <div className="co-confirm-copy">
          <h1>{cancelled ? 'Order cancelled' : order.paymentStatus === 'paid' ? 'Payment successful' : order.status === 'pending' ? 'Awaiting payment' : 'Order confirmed'}</h1>
          <p>
            {cancelled
              ? `${order.id} was cancelled. Stock has been released and any payment refunded.`
              : `Order ${order.id} is ${STATUS_TEXT[order.status] || order.status}. A GST invoice has been sent to ${order.email}.`}
          </p>
          <div className="co-confirm-meta">
            <span>Order <strong>{order.id}</strong></span>
            <span>{new Date(order.createdAt).toLocaleString('en-IN')}</span>
            <span>Total <strong>{formatINR(order.total)}</strong></span>
          </div>
        </div>
        <div className="co-confirm-actions">
          {cancelable && (
            <button className="btn co-cancel-btn" onClick={onCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel order'}
            </button>
          )}
          <button className="btn co-invoice-btn" onClick={() => downloadInvoice(order)}>
            <IconDownload width="15" height="15" /> GST invoice
          </button>
        </div>
      </div>

      <div className="co-track card">
        <div className={`co-steps ${cancelled ? 'co-steps-cancelled' : ''}`}>
          {STEPS.map((s, i) => (
            <div key={s} className={`co-step ${i <= step ? 'co-step-done' : ''} ${i === step && !cancelled ? 'co-step-now' : ''}`}>
              <span className="co-step-dot">
                {i < step ? <IconCheck width="14" height="14" /> : cancelled ? null : <IconClock width="13" height="13" />}
              </span>
              <span className="co-step-label">{s}</span>
            </div>
          ))}
        </div>
        {cancelled && <p className="co-track-note">This order has been cancelled and will not proceed.</p>}
      </div>

      {order.trackingNumber && (
        <div className="card co-track-info">
          <div>
            <span className="co-track-k">Carrier</span>
            <strong>{order.carrier || 'Assemble-on-line Logistics'}</strong>
          </div>
          <div>
            <span className="co-track-k">Tracking number</span>
            <strong className="co-track-no">{order.trackingNumber}</strong>
          </div>
          <div>
            <span className="co-track-k">Estimated delivery</span>
            <strong>{order.estimatedDelivery ? fmtDate(order.estimatedDelivery) : '—'}</strong>
          </div>
          {courierUrl(order) && (
            <div className="co-track-action">
              <a className="btn btn-sm btn-primary" href={courierUrl(order)} target="_blank" rel="noreferrer">
                Track on courier <IconArrowRight width="14" height="14" />
              </a>
            </div>
          )}
        </div>
      )}

      <div className="card co-timeline">
        <h2>Shipment activity</h2>
        <div className="co-timeline-list">
          {(order.events && order.events.length ? order.events : []).map((e, i) => {
            const st = eventState(e)
            const last = i === order.events.length - 1
            return (
              <div key={i} className={`co-timeline-item ${last ? 'co-timeline-last' : ''}`}>
                <span className={`co-timeline-dot ${st.icon}`}>
                  {st.icon === 'truck' ? <IconTruck width="13" height="13" /> : st.icon === 'x' ? <IconX width="13" height="13" /> : <IconCheck width="13" height="13" />}
                </span>
                <div className="co-timeline-copy">
                  <strong>{st.label}</strong>
                  {e.note && <span>{e.note}</span>}
                </div>
                <time>{fmtDate(e.at)}</time>
              </div>
            )
          })}
        </div>
      </div>

      <div className="co-below">
        <div className="co-ordersum card">
          <h2>Items</h2>
          <ul className="co-items co-items-block">
            {order.items.map((i) => {
              const cat = getCategory(i.category)
              return (
                <li key={i.productId} className="co-item">
                  <span className={`co-art co-art-${cat.id}`}>
                    <ProductArt category={cat.icon} />
                  </span>
                  <div className="co-item-info">
                    <Link to={`/product/${i.productId}`}>
                      <strong>{i.name}</strong>
                    </Link>
                    <span>{i.partNo} · Qty {i.qty}</span>
                  </div>
                  <em>{formatINR(i.total)}</em>
                </li>
              )
            })}
          </ul>
          <div className="co-rows">
            <div className="co-row"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
            <div className="co-row"><span>Delivery</span><span>{order.delivery === 0 ? 'FREE' : formatINR(order.delivery)}</span></div>
            <div className="co-row co-row-total"><span>Total</span><span>{formatINR(order.total)}</span></div>
          </div>
        </div>

        <div className="co-detail card">
          <h2>Delivery address</h2>
          <div className="co-addr">
            <IconMapPin width="16" height="16" />
            <div>
              <strong>{order.name}</strong>
              <span>{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}</span>
              <span>{order.address.city}, {order.address.state} — {order.address.pincode}</span>
              <span>{order.phone} · {order.email}</span>
            </div>
          </div>

          <h2>Payment</h2>
          <div className="co-pay">
            <span className="co-pay-method">{METHOD_LABEL[order.paymentMethod] || order.paymentMethod}</span>
            <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-stock' : order.paymentStatus === 'cod' ? 'badge-top' : order.paymentStatus === 'failed' || order.paymentStatus === 'refunded' ? 'badge-sale' : 'badge-low'}`}>
              {order.paymentStatus.toUpperCase()}
            </span>
            {order.paymentRef && <em>Ref {order.paymentRef}</em>}
          </div>

          <div className="co-perks">
            <span><IconShield width="14" height="14" /> 100% genuine parts</span>
            <span><IconTruck width="14" height="14" /> Tracked delivery</span>
          </div>
        </div>
      </div>

      <div className="co-actions">
        <Link to="/shop" className="btn">
          Continue shopping
        </Link>
        <Link to="/orders" className="btn btn-primary">
          View all orders <IconArrowRight width="15" height="15" />
        </Link>
      </div>
    </div>
  )
}
