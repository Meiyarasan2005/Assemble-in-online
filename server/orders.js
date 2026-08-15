import { db, nextId } from './db.js'

const DAY_MS = 86400000

export function addDaysIso(dateIso, days) {
  const d = new Date(dateIso)
  if (isNaN(d)) return dateIso
  return new Date(d.getTime() + days * DAY_MS).toISOString()
}

export function orderEvents(row) {
  if (Array.isArray(row.events) && row.events.length) return row.events
  const events = [{ status: 'placed', note: 'Order placed', at: row.created_at }]
  if (row.payment_status === 'paid' || row.payment_status === 'cod') {
    events.push({ status: 'confirmed', note: 'Payment confirmed', at: row.updated_at })
  }
  return events
}

export function serializeOrder(row, items) {
  const address = row.address || {}
  const events = orderEvents(row)
  const lastShipped = [...events].reverse().find((e) => e.status === 'shipped')
  return {
    id: row._id,
    token: row.token,
    email: row.email,
    name: row.name,
    phone: row.phone,
    address,
    mode: row.mode,
    itemCount: row.item_count,
    subtotal: row.subtotal,
    savings: row.savings,
    delivery: row.delivery,
    tax: row.tax,
    total: row.total,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentRef: row.payment_ref || '',
    carrier: row.carrier || '',
    trackingNumber: row.tracking_number || '',
    estimatedDelivery: row.estimated_delivery || '',
    shippedAt: lastShipped?.at || '',
    events,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  }
}

export async function orderDetail(id, token) {
  const row = await db.orders.findOne({ _id: id, token: token || '' })
  if (!row) return null
  return serializeOrder(row, await orderItems(row._id))
}

export async function adminOrderDetail(id) {
  const row = await db.orders.findOne({ _id: id })
  if (!row) return null
  return serializeOrder(row, await orderItems(row._id))
}

export async function orderItems(orderId) {
  const items = await db.order_items.find({ order_id: orderId }).sort({ _id: 1 }).toArray()
  return items.map((i) => ({
    productId: i.product_id,
    name: i.name,
    partNo: i.part_no,
    brand: i.brand,
    category: i.category,
    unitPrice: i.unit_price,
    mrp: i.mrp,
    qty: i.qty,
    total: i.total,
  }))
}

export async function listOrders(filter = {}, sort = { created_at: -1 }, limit = 100, offset = 0) {
  const rows = await db.orders.find(filter).sort(sort).skip(offset).limit(limit).toArray()
  return Promise.all(rows.map(async (r) => serializeOrder(r, await orderItems(r._id))))
}

export async function appendOrderEvent(orderId, event) {
  await db.orders.updateOne(
    { _id: orderId },
    {
      $set: { updated_at: event.at || new Date().toISOString() },
      $push: { events: event },
    },
  )
}

export async function restockOrder(orderId) {
  const items = await db.order_items.find({ order_id: orderId }).toArray()
  for (const line of items) {
    await db.products.updateOne(
      { _id: line.product_id },
      { $inc: { stock: line.qty }, $set: { updated_at: new Date().toISOString() } },
    )
    await db.stock_movements.insertOne({
      _id: await nextId('stock_movements'),
      product_id: line.product_id,
      delta: line.qty,
      reason: 'Order cancelled',
      note: `Order ${orderId} restocked`,
      created_at: new Date().toISOString(),
    })
  }
}
