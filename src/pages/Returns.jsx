import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../context/useStore'
import { fetchOrders } from '../lib/api'
import { downloadInvoice } from '../lib/invoice'
import { inr } from '../lib/i18n'
import { IconArrowRight, IconCheck, IconClock, IconDownload, IconSearch, IconShield, IconTruck } from '../components/icons'

const RSTEPS = ['Requested', 'Approved', 'Pickup scheduled', 'Refunded']

const REASONS = [
  'Wrong part received',
  'Defective / damaged on arrival',
  'Does not fit my vehicle',
  'Ordered by mistake',
  'Changed my mind',
]

function readReturns() {
  try {
    return JSON.parse(localStorage.getItem('meispare-returns') || '[]')
  } catch {
    return []
  }
}

function writeReturns(list) {
  try {
    localStorage.setItem('meispare-returns', JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

function wrapInvoiceOrder(o) {
  const items = (o.items || []).map((i) => ({
    name: i.name,
    partNo: i.part_no || i.partNo || '',
    price: i.price || 0,
    qty: i.qty || 1,
    total: i.total || (i.price || 0) * (i.qty || 1),
  }))
  return {
    id: o.id,
    createdAt: o.createdAt,
    subtotal: items.reduce((n, i) => n + i.total, 0),
    delivery: o.delivery || 0,
    total: o.total || items.reduce((n, i) => n + i.total, 0),
    items,
    name: o.name || `+91 ${o.phone || ''}`.trim() || 'Customer',
    phone: o.phone || '—',
    email: o.email || '',
    gstin: o.gstin || '',
    address: o.address || { line1: '—', line2: '', city: '—', state: '—', pincode: '—' },
  }
}

export default function Returns() {
  const { notify } = useStore()
  const [returns, setReturns] = useState(readReturns)

  const [form, setForm] = useState({
    orderId: '',
    email: '',
    product: '',
    reason: REASONS[0],
    notes: '',
  })

  const [invPhone, setInvPhone] = useState('')
  const [orders, setOrders] = useState(null)
  const [invState, setInvState] = useState('idle')
  const [invError, setInvError] = useState('')

  const submitReturn = (e) => {
    e.preventDefault()
    if (!form.orderId.trim() || !form.product.trim()) {
      notify('Enter the order id and part name')
      return
    }
    const record = {
      id: `RTN-${Date.now().toString(36).toUpperCase()}`,
      ...form,
      status: 0,
      at: new Date().toISOString(),
    }
    const next = [record, ...returns]
    setReturns(next)
    writeReturns(next)
    notify('Return request saved')
    setForm({ ...form, orderId: '', product: '', notes: '' })
  }

  const loadOrders = useCallback(async (phone) => {
    setInvState('loading')
    setInvError('')
    try {
      const list = await fetchOrders(phone)
      setOrders(list)
      setInvState('ready')
    } catch (err) {
      setOrders(null)
      setInvError(err.message || 'Orders service unavailable')
      setInvState('error')
    }
  }, [])

  const onInvoice = (e) => {
    e.preventDefault()
    if (invPhone.replace(/\D/g, '').length !== 10) {
      setInvError('Enter a valid 10-digit mobile number')
      setInvState('error')
      return
    }
    loadOrders(invPhone.replace(/\D/g, ''))
  }

  const doDownload = (o) => {
    try {
      downloadInvoice(wrapInvoiceOrder(o))
      notify('Invoice downloaded')
    } catch {
      notify('Could not generate invoice')
    }
  }

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <IconArrowRight width="13" height="13" />
        <span>Returns &amp; warranty</span>
      </nav>

      <div className="sec-head returns-head">
        <div>
          <div className="sec-kicker">7-day easy returns · warranty claims</div>
          <h1>Returns &amp; warranty centre</h1>
          <p>Raise a return or warranty claim, track its status, and download your GST invoice.</p>
        </div>
      </div>

      <div className="returns-policy">
        <div className="card returns-policy-card">
          <IconShield width="22" height="22" />
          <div>
            <strong>7-day returns</strong>
            <span>Wrong, damaged or didn't-fit parts can be returned within 7 days of delivery. New and uninstalled items only.</span>
          </div>
        </div>
        <div className="card returns-policy-card">
          <IconCheck width="22" height="22" />
          <div>
            <strong>Warranty — new parts</strong>
            <span>6 months on all new parts. Fitting defects and manufacturing faults covered; consumables &amp; wear items are 30-day.</span>
          </div>
        </div>
        <div className="card returns-policy-card">
          <IconCheck width="22" height="22" />
          <div>
            <strong>Warranty — pre-owned</strong>
            <span>3 months on certified pre-owned parts. Return shipping is free within 30 days on approved claims.</span>
          </div>
        </div>
        <div className="card returns-policy-card">
          <IconTruck width="22" height="22" />
          <div>
            <strong>Free pickup</strong>
            <span>Approved returns get a free reverse pickup from your doorstep within 48 hours.</span>
          </div>
        </div>
      </div>

      <div className="returns-grid">
        <section className="card returns-form-card">
          <h2>Raise a return / warranty request</h2>
          <p className="returns-form-sub">
            Keep this for your records — requests are also emailed to support@assembleonline.in.
          </p>
          <form onSubmit={submitReturn}>
            <div className="returns-field">
              <label htmlFor="rtn-order">Order id</label>
              <input
                id="rtn-order"
                className="input"
                placeholder="e.g. SX-202608-XXXX"
                value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              />
            </div>
            <div className="returns-field">
              <label htmlFor="rtn-product">Part / product</label>
              <input
                id="rtn-product"
                className="input"
                placeholder="e.g. Bosch front brake pads — 0 986 AB1 238"
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
              />
            </div>
            <div className="returns-field">
              <label htmlFor="rtn-reason">Reason</label>
              <select
                id="rtn-reason"
                className="select"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="returns-field">
              <label htmlFor="rtn-notes">Notes (optional)</label>
              <textarea
                id="rtn-notes"
                className="input returns-textarea"
                rows="3"
                placeholder="Anything we should know — fitting shop, damage details, etc."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Submit request
            </button>
          </form>
        </section>

        <section className="card returns-list-card">
          <h2>My requests</h2>
          {returns.length === 0 ? (
            <p className="returns-empty">
              No requests yet. Returns are usually resolved within 5–7 working days.
            </p>
          ) : (
            <ul className="returns-list">
              {returns.map((r) => (
                <li key={r.id} className="return-card">
                  <div className="return-card-head">
                    <strong>{r.id}</strong>
                    <span>{new Date(r.at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="return-card-part">{r.product}</p>
                  <p className="return-card-reason">{r.reason} · {r.orderId}</p>
                  <div className="return-steps">
                    {RSTEPS.map((s, i) => (
                      <div key={s} className={`return-step ${i <= r.status ? 'is-done' : ''} ${i === r.status ? 'is-now' : ''}`}>
                        <span className="return-step-dot">
                          {i < r.status ? <IconCheck width="11" height="11" /> : <IconClock width="11" height="11" />}
                        </span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card returns-invoice-card">
        <h2>Download GST invoice</h2>
        <p className="returns-form-sub">
          Enter the mobile number used at checkout to list your orders and download a tax invoice for each.
        </p>
        <form className="orders-search" onSubmit={onInvoice}>
          <IconSearch width="18" height="18" />
          <input
            className="orders-input"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={invPhone}
            onChange={(e) => setInvPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            aria-label="Invoice mobile number"
          />
          <button className="btn btn-primary" type="submit">
            Find invoices
          </button>
        </form>

        {invState === 'loading' && (
          <div className="co-loading" style={{ padding: '24px 0' }}>
            <span className="spinner" />
            <p>Loading orders…</p>
          </div>
        )}

        {invState === 'error' && <p className="returns-invoice-error">{invError}</p>}

        {invState === 'ready' && orders.length === 0 && (
          <p className="returns-empty">No orders found for that mobile number.</p>
        )}

        {invState === 'ready' && orders.length > 0 && (
          <ul className="invoice-list">
            {orders.map((o) => (
              <li key={o.id} className="invoice-row">
                <span className="invoice-id">{o.id}</span>
                <span className="invoice-date">{new Date(o.createdAt).toLocaleString('en-IN')}</span>
                <span className="invoice-total">{inr((o.items || []).reduce((n, i) => n + (i.total || i.price * i.qty || 0), 0) || o.total)}</span>
                <button className="btn btn-sm btn-primary" onClick={() => doDownload(o)}>
                  <IconDownload width="14" height="14" /> Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
