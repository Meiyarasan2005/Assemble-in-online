import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatINR } from '../data'
import { trackOrder } from '../lib/api'
import { downloadInvoice } from '../lib/invoice'
import { getCategory } from '../data'
import ProductArt from '../components/ProductArt'
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconDownload,
  IconMapPin,
  IconSearch,
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

export default function Track() {
  const navigate = useNavigate()
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState('idle') // idle | loading | ready | error
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const id = orderId.trim()
    const ph = phone.replace(/\D/g, '').slice(0, 10)
    if (id.length < 5) {
      setError('Enter the order ID from your confirmation')
      setState('error')
      return
    }
    if (ph.length !== 10) {
      setError('Enter the 10-digit mobile number used at checkout')
      setState('error')
      return
    }
    setState('loading')
    setError('')
    try {
      const data = await trackOrder(id, ph)
      setOrder(data)
      setState('ready')
    } catch (err) {
      setError(err.message || 'Could not find that order')
      setOrder(null)
      setState('error')
    }
  }

  return (
    <div className="container">
      <div className="orders-head">
        <h1>Track your order</h1>
        <p>Enter your order ID and mobile number to see live delivery status — just like online.</p>
      </div>

      <form className="track-search card" onSubmit={submit}>
        <div className="track-fields">
          <label className="co-field">
            <span>Order ID</span>
            <input
              className="input"
              placeholder="e.g. AO-48172934-2051"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="co-field">
            <span>Mobile number</span>
            <input
              className="input"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              autoComplete="tel"
            />
          </label>
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={state === 'loading'}>
          {state === 'loading' ? (
            'Tracking…'
          ) : (
            <>
              <IconSearch width="15" height="15" /> Track order
            </>
          )}
        </button>
        <p className="track-hint">Tip: your order ID starts with <strong>AO-</strong> and appears on your order confirmation and invoice.</p>
      </form>

      {state === 'error' && (
        <div className="empty-state card" style={{ marginTop: 32 }}>
          <IconSearch width="40" height="40" />
          <h3>We couldn't find your order</h3>
          <p>{error}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/orders" className="btn">Find by email instead</Link>
            <a href="https://wa.me/9003344069" target="_blank" rel="noreferrer" className="btn btn-primary">
              Contact support
            </a>
          </div>
        </div>
      )}

      {state === 'ready' && order && (
        <div className="track-result">
          <div className="co-confirm card">
            <div className={`co-confirm-badge ${order.status === 'cancelled' ? 'co-confirm-bad' : ''}`}>
              {order.status === 'cancelled' ? <IconX width="30" height="30" /> : <IconCheck width="30" height="30" />}
            </div>
            <div className="co-confirm-copy">
              <h1>{order.status === 'cancelled' ? 'Order cancelled' : STATUS_TEXT[order.status] || order.status}</h1>
              <p>Order {order.id} placed on {fmtDate(order.createdAt)} · {order.itemCount} item(s) · {formatINR(order.total)}</p>
              <div className="co-confirm-meta">
                <span>Order <strong>{order.id}</strong></span>
                <span>Tracking <strong className="co-track-no">{order.trackingNumber || '—'}</strong></span>
                <span>Estimated delivery <strong>{order.estimatedDelivery ? fmtDate(order.estimatedDelivery) : '—'}</strong></span>
              </div>
            </div>
            <div className="co-confirm-actions">
              <button className="btn co-invoice-btn" onClick={() => downloadInvoice(order)}>
                <IconDownload width="15" height="15" /> GST invoice
              </button>
              <button className="btn btn-primary" onClick={() => navigate(`/order/${order.id}?token=${order.token}`)}>
                Full details <IconArrowRight width="14" height="14" />
              </button>
            </div>
          </div>

          <div className="co-track card">
            <div className={`co-steps ${order.status === 'cancelled' ? 'co-steps-cancelled' : ''}`}>
              {STEPS.map((s, i) => (
                <div key={s} className={`co-step ${i <= activeStep(order) ? 'co-step-done' : ''} ${i === activeStep(order) && order.status !== 'cancelled' ? 'co-step-now' : ''}`}>
                  <span className="co-step-dot">
                    {i < activeStep(order) ? <IconCheck width="14" height="14" /> : order.status === 'cancelled' ? null : <IconClock width="13" height="13" />}
                  </span>
                  <span className="co-step-label">{s}</span>
                </div>
              ))}
            </div>
            {order.status === 'cancelled' && <p className="co-track-note">This order has been cancelled and will not proceed. Your stock has been released and any payment refunded.</p>}
          </div>

          <div className="track-cols">
            <div className="card co-timeline">
              <h2>Shipment activity</h2>
              <div className="co-timeline-list">
                {(order.events && order.events.length ? order.events : []).map((e, i) => {
                  const last = i === order.events.length - 1
                  const icon = e.status === 'shipped' || e.status === 'out_for_delivery' ? 'truck' : e.status === 'cancelled' || e.status === 'refunded' ? 'x' : 'check'
                  return (
                    <div key={i} className={`co-timeline-item ${last ? 'co-timeline-last' : ''}`}>
                      <span className={`co-timeline-dot ${icon}`}>
                        {icon === 'truck' ? <IconTruck width="13" height="13" /> : icon === 'x' ? <IconX width="13" height="13" /> : <IconCheck width="13" height="13" />}
                      </span>
                      <div className="co-timeline-copy">
                        <strong>{e.note || e.status}</strong>
                        {e.status !== 'placed' && <span>{e.status}</span>}
                      </div>
                      <time>{fmtDate(e.at)}</time>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="track-side">
              <div className="co-detail card">
                <h2>Delivery address</h2>
                <div className="co-addr">
                  <IconMapPin width="16" height="16" />
                  <div>
                    <strong>{order.name}</strong>
                    <span>{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}</span>
                    {order.address.location && <span>{order.address.location}</span>}
                    <span>{order.address.city}, {order.address.state} — {order.address.pincode}</span>
                    <span>{order.phone}</span>
                  </div>
                </div>

                <h2>Payment</h2>
                <div className="co-pay">
                  <span className="co-pay-method">Cash on delivery</span>
                  <span className="badge badge-top">COD</span>
                </div>

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
                          <strong>{i.name}</strong>
                          <span>{i.partNo} · Qty {i.qty}</span>
                        </div>
                        <em>{formatINR(i.total)}</em>
                      </li>
                    )
                  })}
                </ul>
                <div className="co-rows">
                  <div className="co-row"><span>Total payable on delivery</span><span>{formatINR(order.total)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}