import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db, now, nextId, docOut, docsOut, escapeRegExp, withTx } from './db.js'
import { preownedProducts } from '../src/data.js'
import { orderDetail, serializeOrder, addDaysIso, restockOrder } from './orders.js'
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  markOrderPaid,
  razorpayConfig,
  razorpayEnabled,
  verifyRazorpaySignature,
} from './payments.js'
import {
  addCustomerAddress,
  createCustomerSession,
  customerAddresses,
  customerFromToken,
  changeCustomerPassword,
  deleteCustomerAddress,
  destroyCustomerSession,
  loginCustomer,
  registerCustomer,
  updateCustomerAddress,
  updateCustomerProfile,
} from './customer-auth.js'

const router = Router()

const FREE_DELIVERY_THRESHOLD = 1999
const DELIVERY_FEE = 149

/* ---------- helpers ---------- */

function orderNumber() {
  return `MS-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()}`
}

async function deductStock(orderId, items, session) {
  for (const line of items) {
    await db.products.updateOne(
      { _id: line.productId },
      { $inc: { stock: -line.qty }, $set: { updated_at: now() } },
      session ? { session } : {},
    )
    await db.stock_movements.insertOne(
      {
        _id: await nextId('stock_movements'),
        product_id: line.productId,
        delta: -line.qty,
        reason: 'Order placed',
        note: `Order ${orderId}`,
        created_at: now(),
      },
      session ? { session } : {},
    )
  }
}

/* ---------- customer accounts ---------- */

async function authedCustomer(req) {
  return customerFromToken(String(req.headers['x-auth-token'] || ''))
}

router.post('/auth/register', async (req, res) => {
  try {
    const customer = await registerCustomer(req.body || {})
    const token = await createCustomerSession(customer.id)
    res.status(201).json({ token, customer })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/auth/login', async (req, res) => {
  try {
    const customer = await loginCustomer(req.body || {})
    const token = await createCustomerSession(customer.id)
    res.json({ token, customer })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/auth/logout', async (req, res) => {
  const token = String(req.body?.token ?? req.headers['x-auth-token'] ?? '')
  if (token) await destroyCustomerSession(token)
  res.json({ ok: true })
})

router.get('/auth/me', async (req, res) => {
  const customer = await authedCustomer(req)
  if (!customer) return res.status(401).json({ error: 'Not signed in' })
  res.json({ customer, addresses: await customerAddresses(customer.email) })
})

router.put('/auth/profile', async (req, res) => {
  try {
    const customer = await authedCustomer(req)
    if (!customer) return res.status(401).json({ error: 'Not signed in' })
    const updated = await updateCustomerProfile(customer.email, req.body || {})
    res.json({ customer: updated })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/auth/password', async (req, res) => {
  try {
    const customer = await authedCustomer(req)
    if (!customer) return res.status(401).json({ error: 'Not signed in' })
    await changeCustomerPassword(customer.email, req.body || {})
    res.json({ ok: true })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.get('/addresses', async (req, res) => {
  const customer = await authedCustomer(req)
  if (!customer) return res.status(401).json({ error: 'Not signed in' })
  res.json(await customerAddresses(customer.email))
})

router.post('/addresses', async (req, res) => {
  try {
    const customer = await authedCustomer(req)
    if (!customer) return res.status(401).json({ error: 'Not signed in' })
    res.status(201).json(await addCustomerAddress(customer.email, req.body || {}))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.put('/addresses/:id', async (req, res) => {
  try {
    const customer = await authedCustomer(req)
    if (!customer) return res.status(401).json({ error: 'Not signed in' })
    res.json(await updateCustomerAddress(customer.email, req.params.id, req.body || {}))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.delete('/addresses/:id', async (req, res) => {
  try {
    const customer = await authedCustomer(req)
    if (!customer) return res.status(401).json({ error: 'Not signed in' })
    res.json(await deleteCustomerAddress(customer.email, req.params.id))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

/* ---------- catalogue ---------- */

router.get('/catalog', async (req, res) => {
  const { search, category, brand, vehicle, max, inStock, sort = 'featured', limit, offset } = req.query
  const filter = {}

  if (search) {
    const rx = new RegExp(escapeRegExp(search), 'i')
    filter.$or = [{ name: rx }, { part_no: rx }, { brand: rx }]
  }
  if (category) filter.category = category
  if (brand) filter.brand = brand
  if (vehicle) filter.fits = String(vehicle)
  if (max) filter.price = { $lte: Number(max) }
  if (inStock === '1' || inStock === 'true') filter.stock = { $gt: 0 }

  const sortMap = {
    name: { name: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { rating: -1 },
    reviews: { reviews: -1 },
    updated: { updated_at: -1 },
    featured: { popular: -1, reviews: -1 },
  }
  const order = sortMap[sort] || sortMap.featured

  const total = await db.products.countDocuments(filter)
  const items = await db.products
    .find(filter)
    .sort(order)
    .skip(Number(offset) || 0)
    .limit(Math.min(Number(limit) || 200, 500))
    .toArray()

  res.json({ total, items: docsOut(items) })
})

router.get('/catalog/:id', async (req, res) => {
  const row = await db.products.findOne({ _id: req.params.id })
  if (!row) return res.status(404).json({ error: 'Product not found' })
  res.json(docOut(row))
})

router.get('/meta', async (_req, res) => {
  const categories = await db.categories.find().sort({ sort_order: 1, name: 1 }).toArray()
  const categoriesOut = await Promise.all(
    categories.map(async (c) => ({
      ...docOut(c),
      productCount: await db.products.countDocuments({ category: c._id }),
    })),
  )
  const brands = await db.products.distinct('brand')
  brands.sort((a, b) => a.localeCompare(b))
  const vehicles = await db.vehicles.find().sort({ make: 1, model: 1 }).toArray()
  res.json({ categories: categoriesOut, brands, vehicles: docsOut(vehicles) })
})

/* ---------- checkout ---------- */

router.post('/checkout', async (req, res) => {
  const account = await authedCustomer(req)
  if (!account) {
    return res.status(401).json({ error: 'Please log in or create an account to continue' })
  }

  const body = req.body || {}
  const mode = body.mode === 'preowned' ? 'preowned' : 'retail'
  const email = account.email
  const name = String(body.name ?? '').trim()
  const phone = String(body.phone ?? '').replace(/\D/g, '').slice(0, 10)
  let address = {
    line1: String(body.address?.line1 ?? '').trim(),
    line2: String(body.address?.line2 ?? '').trim(),
    city: String(body.address?.city ?? '').trim(),
    state: String(body.address?.state ?? '').trim(),
    pincode: String(body.address?.pincode ?? '').trim(),
  }
  const paymentMethod = String(body.paymentMethod ?? '')
  const cart = Array.isArray(body.cart) ? body.cart : []

  if (body.addressId) {
    const saved = await customerAddresses(email)
    const picked = saved.find((a) => String(a.id) === String(body.addressId))
    if (!picked) return res.status(400).json({ error: 'Saved address not found' })
    address = {
      line1: picked.line1,
      line2: picked.line2 || '',
      city: picked.city,
      state: picked.state,
      pincode: picked.pincode,
    }
  }

  if (name.length < 2) return res.status(400).json({ error: 'Full name is required' })
  if (phone.length !== 10) return res.status(400).json({ error: 'A valid 10-digit phone number is required' })
  if (!address.line1 || !address.city || !address.state || !/^\d{6}$/.test(address.pincode)) {
    return res.status(400).json({ error: 'Complete delivery address with 6-digit PIN is required' })
  }
  if (!['upi', 'card', 'netbanking', 'cod'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Choose a payment method (UPI, card, net banking or COD)' })
  }
  if (cart.length === 0) return res.status(400).json({ error: 'Your cart is empty' })

  const items = []
  for (const line of cart) {
    const id = String(line.id ?? '')
    const qty = Math.round(Number(line.qty) || 0)
    let product = await db.products.findOne({ _id: id })
    let isPreowned = false
    if (!product) {
      const pre = preownedProducts.find((p) => p.id === id)
      if (pre) {
        product = { ...pre, _id: pre.id, part_no: pre.partNo }
        isPreowned = true
      }
    }
    if (!product) return res.status(400).json({ error: `Product ${id} no longer exists` })
    if (qty < 1) return res.status(400).json({ error: 'Quantity must be at least 1' })
    if (qty > product.stock) {
      return res.status(409).json({
        error: `Only ${product.stock} unit(s) of "${product.name}" in stock`,
        product: { id: product._id, stock: product.stock },
      })
    }
    const unit = product.price
    items.push({
      productId: product._id,
      name: product.name,
      partNo: product.part_no,
      brand: product.brand,
      category: product.category,
      unitPrice: unit,
      mrp: product.mrp,
      qty,
      total: Math.round(unit * qty),
      isPreowned,
    })
  }

  const subtotal = items.reduce((n, i) => n + i.total, 0)
  const savings = items.reduce((n, i) => n + Math.max(0, i.mrp - i.unitPrice) * i.qty, 0)
  const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const tax = 0 // prices are inclusive of GST
  const total = subtotal + delivery
  const itemCount = items.reduce((n, i) => n + i.qty, 0)

  const existingCustomer = await db.customers.findOne({ _id: email })
  if (existingCustomer) {
    await db.customers.updateOne({ _id: email }, { $set: { phone, name } })
  } else {
    await db.customers.insertOne({ _id: email, email, phone, name, password_hash: '', salt: '', created_at: now() })
  }

  const orderId = orderNumber()
  const orderToken = randomUUID()
  const isCod = paymentMethod === 'cod'
  const status = isCod ? 'confirmed' : 'pending'
  const paymentStatus = isCod ? 'cod' : 'unpaid'
  const createdAt = now()
  const events = [
    { status: 'placed', note: 'Order placed', at: createdAt },
    ...(isCod ? [{ status: 'confirmed', note: 'Payment method: Cash on delivery', at: createdAt }] : []),
  ]

  await withTx(async (session) => {
    const opts = session ? { session } : {}
    await db.orders.insertOne(
      {
        _id: orderId,
        customer_id: email,
        token: orderToken,
        email,
        name,
        phone,
        address,
        mode,
        item_count: itemCount,
        subtotal,
        savings,
        delivery,
        tax,
        total,
        status,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        payment_ref: '',
        estimated_delivery: addDaysIso(createdAt, 4),
        events,
        created_at: createdAt,
        updated_at: createdAt,
      },
      opts,
    )
    const insertItem = async (item) =>
      db.order_items.insertOne(
        {
          _id: await nextId('order_items'),
          order_id: orderId,
          product_id: item.productId,
          name: item.name,
          part_no: item.partNo,
          brand: item.brand,
          category: item.category,
          unit_price: item.unitPrice,
          mrp: item.mrp,
          qty: item.qty,
          total: item.total,
        },
        opts,
      )
    for (const i of items) await insertItem(i)
    const stockItems = items.filter((i) => !i.isPreowned)
    if (stockItems.length) await deductStock(orderId, stockItems, session)
  })

  const order = await orderDetail(orderId, orderToken)

  if (isCod) {
    res.status(201).json({ order })
    return
  }

  if (razorpayEnabled()) {
    let pgOrder
    try {
      pgOrder = await createRazorpayOrder({
        amount: total * 100,
        receipt: orderId,
        notes: { order_id: orderId, email, name },
      })
      await db.orders.updateOne({ _id: orderId }, { $set: { pg_order_id: pgOrder.id } })
    } catch (e) {
      console.error(`[rz] order create failed for ${orderId}: ${e.message}`)
      pgOrder = null
    }
    if (pgOrder) {
      res.status(201).json({
        order,
        paymentIntent: {
          provider: 'razorpay',
          keyId: razorpayConfig().keyId,
          orderId: pgOrder.id,
          amount: total,
          currency: 'INR',
          sandbox: true,
        },
      })
      return
    }
  }

  // Simulated sandbox gateway (fallback when Razorpay keys are not configured):
  // in production this returns a Razorpay/Stripe intent created above.
  res.status(201).json({
    order,
    paymentIntent: {
      id: `pay_${orderId.toLowerCase()}`,
      amount: total,
      currency: 'INR',
      method: paymentMethod,
      sandbox: true,
    },
  })
})

/* ---------- sandbox payment ---------- */

router.post('/payments/:orderId/complete', async (req, res) => {
  const { orderId } = req.params
  const token = String(req.body?.token ?? '')
  const method = String(req.body?.method ?? 'upi')
  const row = await db.orders.findOne({ _id: orderId, token })
  if (!row) return res.status(404).json({ error: 'Order not found' })
  if (row.status !== 'pending') {
    return res.status(400).json({ error: `Order is already ${row.status}` })
  }
  if (row.payment_status !== 'unpaid') {
    return res.status(400).json({ error: 'Order payment already processed' })
  }

  const ref =
    method === 'card'
      ? 'CARD-' + Math.floor(100000000000 + Math.random() * 899999999999)
      : 'UPI-' + Math.floor(100000000000 + Math.random() * 899999999999)
  const order = await markOrderPaid(orderId, {
    method,
    paymentRef: ref,
    note: `Payment received (${method.toUpperCase()})`,
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  res.json(order)
})

router.post('/payments/:orderId/retry', async (req, res) => {
  const { orderId } = req.params
  const token = String(req.body?.token ?? '')
  const row = await db.orders.findOne({ _id: orderId, token })
  if (!row) return res.status(404).json({ error: 'Order not found' })
  if (row.status !== 'pending') {
    return res.status(400).json({ error: `Order is already ${row.status}` })
  }
  if (row.payment_status !== 'unpaid') {
    return res.status(400).json({ error: 'Order payment already processed' })
  }

  const order = await orderDetail(orderId, token)

  if (razorpayEnabled()) {
    let pgOrder
    try {
      pgOrder = await createRazorpayOrder({
        amount: row.total * 100,
        receipt: orderId,
        notes: { order_id: orderId, email: row.email, name: row.name },
      })
      await db.orders.updateOne({ _id: orderId }, { $set: { pg_order_id: pgOrder.id } })
    } catch (e) {
      console.error(`[rz] retry order create failed for ${orderId}: ${e.message}`)
      pgOrder = null
    }
    if (pgOrder) {
      res.json({
        order,
        paymentIntent: {
          provider: 'razorpay',
          keyId: razorpayConfig().keyId,
          orderId: pgOrder.id,
          amount: row.total,
          currency: 'INR',
          sandbox: true,
        },
      })
      return
    }
  }

  res.json({
    order,
    paymentIntent: {
      id: `pay_${orderId.toLowerCase()}`,
      amount: row.total,
      currency: 'INR',
      method: row.payment_method || 'upi',
      sandbox: true,
    },
  })
})

/* ---------- Razorpay (test mode) ---------- */

router.post('/payments/razorpay/verify', async (req, res) => {
  const body = req.body || {}
  const orderId = String(body.order_id ?? '')
  const token = String(body.token ?? '')
  if (!razorpayEnabled()) {
    return res.status(503).json({ error: 'Razorpay is not configured on this server' })
  }
  if (!orderId || !token) return res.status(400).json({ error: 'Missing order details' })

  const row = await db.orders.findOne({ _id: orderId, token })
  if (!row) return res.status(404).json({ error: 'Order not found' })
  if (row.payment_status === 'paid' && row.status === 'confirmed') {
    return res.json(await orderDetail(orderId, token))
  }
  if (!verifyRazorpaySignature(body)) {
    return res.status(400).json({ error: 'Payment signature verification failed' })
  }

  let payment
  try {
    payment = await fetchRazorpayPayment(body.razorpay_payment_id)
  } catch (e) {
    return res.status(502).json({ error: `Could not confirm payment with Razorpay: ${e.message}` })
  }
  if (payment.order_id !== body.razorpay_order_id) {
    return res.status(400).json({ error: 'Payment does not match this order' })
  }
  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    return res.status(400).json({ error: `Payment status is ${payment.status}, not captured` })
  }

  const order = await markOrderPaid(orderId, {
    method: payment.method,
    paymentRef: payment.id,
    note: `Payment received via Razorpay (${(payment.method || 'online').toUpperCase()})`,
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(order)
})

router.post('/payments/:orderId/fail', async (req, res) => {
  const { orderId } = req.params
  const token = String(req.body?.token ?? '')
  const row = await db.orders.findOne({ _id: orderId, token })
  if (!row) return res.status(404).json({ error: 'Order not found' })
  if (row.status === 'cancelled') return res.json(await orderDetail(orderId, token))

  const at = now()
  await db.orders.updateOne(
    { _id: orderId },
    {
      $set: { status: 'cancelled', payment_status: 'failed', updated_at: at },
      $push: { events: { status: 'cancelled', note: 'Payment failed — order cancelled', at } },
    },
  )
  await restockOrder(orderId)

  res.json(await orderDetail(orderId, token))
})

/* ---------- orders ---------- */

router.get('/orders', async (req, res) => {
  const account = await authedCustomer(req)
  const email = account ? account.email : String(req.query.email ?? '').trim().toLowerCase()
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' })
  }
  const rows = await db.orders.find({ email }).sort({ created_at: -1 }).limit(limit).toArray()
  const out = []
  for (const r of rows) {
    const items = await db.order_items.find({ order_id: r._id }).sort({ _id: 1 }).toArray()
    out.push(serializeOrder(r, items))
  }
  res.json(out)
})

router.get('/orders/:id', async (req, res) => {
  const token = String(req.query.token ?? '')
  const order = await orderDetail(req.params.id, token)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(order)
})

router.post('/orders/:id/cancel', async (req, res) => {
  const token = String(req.body?.token ?? '')
  const row = await db.orders.findOne({ _id: req.params.id, token })
  if (!row) return res.status(404).json({ error: 'Order not found' })
  if (row.status === 'cancelled') return res.json(await orderDetail(req.params.id, token))
  if (['shipped', 'delivered'].includes(row.status)) {
    return res.status(400).json({ error: `Order already ${row.status} — cannot cancel` })
  }

  const at = now()
  await db.orders.updateOne(
    { _id: row._id },
    {
      $set: { status: 'cancelled', payment_status: 'refunded', updated_at: at },
      $push: { events: { status: 'cancelled', note: 'Order cancelled by customer — refund initiated', at } },
    },
  )
  await restockOrder(row._id)

  res.json(await orderDetail(req.params.id, token))
})

export default router
