import { createHmac } from 'node:crypto'
import { db } from './db.js'
import { orderDetail } from './orders.js'

const KEY_ID = String(process.env.RAZORPAY_KEY_ID ?? '').trim()
const KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET ?? '').trim()

const BASE = 'https://api.razorpay.com/v1'

export function razorpayEnabled() {
  return Boolean(KEY_ID && KEY_SECRET)
}

export function razorpayConfig() {
  return { enabled: razorpayEnabled(), keyId: KEY_ID }
}

const authHeader = () =>
  'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')

async function rz(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
      ...(opts.headers || {}),
    },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const desc = data?.error?.description || data?.error?.reason || data?.error?.message
    const err = new Error(desc || `Razorpay API error (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export async function createRazorpayOrder({ amount, receipt, notes }) {
  return rz('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt,
      notes,
      payment_capture: 1,
    }),
  })
}

export async function fetchRazorpayPayment(paymentId) {
  return rz(`/payments/${encodeURIComponent(paymentId)}`)
}

export function verifyRazorpaySignature(payload) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload || {}
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false
  const expected = createHmac('sha256', KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')
  return expected === razorpay_signature
}

export function verifyRazorpayWebhookSignature(rawBody, signature) {
  if (!signature || !rawBody) return false
  const expected = createHmac('sha256', KEY_SECRET).update(rawBody).digest('hex')
  return expected === signature
}

const METHOD_LABELS = {
  card: 'card',
  upi: 'UPI',
  netbanking: 'netbanking',
  wallet: 'wallet',
  emi: 'EMI',
  paylater: 'pay later',
  bank_transfer: 'bank transfer',
}

export async function markOrderPaid(orderId, { method, paymentRef, note }) {
  const row = await db.orders.findOne({ _id: orderId })
  if (!row) return null
  const order = await orderDetail(orderId, row.token)
  if (order.status === 'confirmed' && order.paymentStatus === 'paid') return order

  const at = new Date().toISOString()
  const label = METHOD_LABELS[method] || method || 'online'
  await db.orders.updateOne(
    { _id: orderId },
    {
      $set: {
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: label,
        payment_ref: paymentRef || row.payment_ref,
        updated_at: at,
      },
      $push: {
        events: { status: 'confirmed', note: note || `Payment received (${label.toUpperCase()})`, at },
      },
    },
  )
  return orderDetail(row._id, row.token)
}

export async function handleRazorpayWebhook(rawBody, signature) {
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    const err = new Error('Invalid webhook signature')
    err.status = 400
    throw err
  }
  const event = JSON.parse(rawBody.toString('utf8'))
  const entity = event?.payload?.payment?.entity
  if (!entity) return

  const rzOrderId = entity.order_id
  const order = rzOrderId
    ? await db.orders.findOne({ pg_order_id: rzOrderId })
    : null
  if (!order) return

  if (entity.status === 'authorized' || entity.status === 'captured') {
    await markOrderPaid(order._id, {
      method: entity.method,
      paymentRef: entity.id,
      note: `Payment received via Razorpay (${METHOD_LABELS[entity.method] || entity.method || 'online'})`,
    })
  }
}
