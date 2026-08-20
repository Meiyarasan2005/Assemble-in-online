import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join } from 'node:path'
import multer from 'multer'
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
import { userFromToken as adminUserFromToken, createSession as createAdminSession, destroySession as destroyAdminSession } from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadsDir = join(__dirname, 'public', 'uploads')

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `product-${Date.now()}${ext}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

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

/* ---------- offers (storefront) ---------- */

router.get('/offers', async (_req, res) => {
  const nowIso = now()
  const rows = await db.offers
    .find({ active: true })
    .sort({ sort_order: 1, created_at: -1 })
    .toArray()
  const offers = []
  for (const r of rows) {
    if (r.starts_at && r.starts_at > nowIso) continue
    if (r.ends_at && r.ends_at < nowIso) continue
    let product = null
    if (r.product_id) {
      const p = await db.products.findOne({ _id: r.product_id })
      if (p) {
        product = {
          id: p._id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          mrp: p.mrp,
          stock: p.stock,
        }
      }
    }
    offers.push({
      id: r._id,
      title: r.title,
      description: r.description,
      discount_pct: r.discount_pct,
      image: r.image,
      badge: r.badge,
      product,
    })
  }
  res.json(offers)
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

/* ---------- banner ---------- */

router.get('/banner', async (_req, res) => {
  try {
    const doc = await db.site_settings.findOne({ _id: 'sale-banner' })
    res.json(doc ? doc.data : { badge: 'SALE', title: 'Up to 40% Off on Braking Parts', desc: 'Pads, rotors, calipers & more — genuine brands at clearance prices.', image: '' })
  } catch {
    res.json({ badge: 'SALE', title: 'Up to 40% Off on Braking Parts', desc: 'Pads, rotors, calipers & more — genuine brands at clearance prices.', image: '' })
  }
})

router.put('/banner', async (req, res) => {
  const seller = await sellerFromToken(req)
  if (!seller) return res.status(401).json({ error: 'Seller login required' })

  const b = req.body || {}
  const data = {
    badge: String(b.badge ?? 'SALE').trim(),
    title: String(b.title ?? '').trim(),
    desc: String(b.desc ?? '').trim(),
    image: String(b.image ?? ''),
  }
  await db.site_settings.updateOne(
    { _id: 'sale-banner' },
    { $set: { data, updated_at: now(), updated_by: seller.username } },
    { upsert: true },
  )
  res.json(data)
})

/* ---------- seller ---------- */

async function sellerFromToken(req) {
  const token = String(req.headers['x-seller-token'] || '')
  if (!token) return null
  return adminUserFromToken(token)
}

router.post('/seller/login', async (req, res) => {
  const { verifyPassword } = await import('./auth.js')
  const username = String(req.body?.username ?? '').trim()
  const password = String(req.body?.password ?? '')
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' })
  const user = await db.users.findOne({ username })
  if (!user || !verifyPassword(password, user.salt, user.pass_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }
  const token = await createAdminSession(user._id)
  res.json({ token, seller: { id: user._id, username: user.username } })
})

router.post('/seller/logout', async (req, res) => {
  const token = String(req.headers['x-seller-token'] || '')
  if (token) await destroyAdminSession(token)
  res.json({ ok: true })
})

router.get('/seller/me', async (req, res) => {
  const seller = await sellerFromToken(req)
  if (!seller) return res.status(401).json({ error: 'Not authenticated as seller' })
  res.json({ seller })
})

router.put('/seller/products/:id', async (req, res) => {
  const seller = await sellerFromToken(req)
  if (!seller) return res.status(401).json({ error: 'Seller login required' })

  const existing = await db.products.findOne({ _id: req.params.id })
  if (!existing) return res.status(404).json({ error: 'Product not found' })

  const b = req.body || {}
  const update = {}
  if (b.price != null) update.price = Math.max(0, Number(b.price) || 0)
  if (b.mrp != null) update.mrp = Math.max(0, Number(b.mrp) || 0)
  if (b.stock != null) {
    const newStock = Math.max(0, Math.round(Number(b.stock) || 0))
    const delta = newStock - existing.stock
    update.stock = newStock
    if (delta !== 0) {
      await db.stock_movements.insertOne({
        _id: await nextId('stock_movements'),
        product_id: existing._id,
        delta,
        reason: 'Seller updated stock',
        note: `By ${seller.username}`,
        created_at: now(),
      })
    }
  }
  if (b.image != null) update.image = String(b.image)
  if (b.name != null) update.name = String(b.name).trim()
  if (b.desc != null) update.desc = String(b.desc)

  update.updated_at = now()

  await db.products.updateOne({ _id: existing._id }, { $set: update })
  const updated = await db.products.findOne({ _id: existing._id })
  res.json(docOut(updated))
})

router.post('/seller/products/:id/image', upload.single('image'), async (req, res) => {
  const seller = await sellerFromToken(req)
  if (!seller) return res.status(401).json({ error: 'Seller login required' })

  const existing = await db.products.findOne({ _id: req.params.id })
  if (!existing) return res.status(404).json({ error: 'Product not found' })
  if (!req.file) return res.status(400).json({ error: 'No image file provided' })

  const imageUrl = `/uploads/${req.file.filename}`
  await db.products.updateOne(
    { _id: existing._id },
    { $set: { image: imageUrl, updated_at: now() } },
  )
  const updated = await db.products.findOne({ _id: existing._id })
  res.json(docOut(updated))
})

router.post('/seller/products', upload.single('image'), async (req, res) => {
  const seller = await sellerFromToken(req)
  if (!seller) return res.status(401).json({ error: 'Seller login required' })

  const b = req.body || {}
  const id = String(b.id ?? '').trim() || `sp-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
  const name = String(b.name ?? '').trim()
  const category = String(b.category ?? '').trim()
  const brand = String(b.brand ?? '').trim()
  if (!name) return res.status(400).json({ error: 'Product name is required' })
  if (!category) return res.status(400).json({ error: 'Category is required' })
  if (!brand) return res.status(400).json({ error: 'Brand is required' })

  const exists = await db.products.findOne({ _id: id })
  if (exists) return res.status(409).json({ error: 'Product ID already exists' })

  let imageUrl = String(b.image ?? '')
  if (req.file) imageUrl = `/uploads/${req.file.filename}`

  const doc = {
    _id: id,
    name,
    category,
    brand,
    part_no: String(b.part_no ?? '').trim(),
    image: imageUrl,
    price: Math.max(0, Number(b.price) || 0),
    mrp: Math.max(0, Number(b.mrp) || 0),
    stock: Math.max(0, Math.round(Number(b.stock) || 0)),
    rating: Math.min(5, Math.max(0, Number(b.rating) || 0)),
    reviews: Math.max(0, Math.round(Number(b.reviews) || 0)),
    popular: Boolean(b.popular),
    badge: String(b.badge ?? ''),
    desc: String(b.desc ?? ''),
    features: Array.isArray(b.features) ? b.features.map(String) : [],
    fits: Array.isArray(b.fits) ? b.fits.map(String) : [],
    created_at: now(),
    updated_at: now(),
  }

  await db.products.insertOne(doc)
  if (doc.stock > 0) {
    await db.stock_movements.insertOne({
      _id: await nextId('stock_movements'),
      product_id: doc._id,
      delta: doc.stock,
      reason: 'Seller created product',
      note: `By ${seller.username}`,
      created_at: now(),
    })
  }
  res.status(201).json(docOut(doc))
})

export default router
