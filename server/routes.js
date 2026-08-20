import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db, now, nextId, docOut, docsOut, escapeRegExp, reseed, withTx } from './db.js'
import { createUser, verifyPassword, createSession, destroySession, userFromToken } from './auth.js'
import {
  adminOrderDetail,
  appendOrderEvent,
  listOrders,
  restockOrder,
} from './orders.js'

const router = Router()

const ADMIN_TOKEN_HEADER = 'x-admin-token'

function adminToken(req) {
  return String(req.headers[ADMIN_TOKEN_HEADER] || '')
}

function serializeProduct(body) {
  return {
    id: String(body.id ?? '').trim() || randomUUID(),
    name: String(body.name ?? '').trim(),
    category: String(body.category ?? '').trim(),
    brand: String(body.brand ?? '').trim(),
    part_no: String(body.part_no ?? '').trim(),
    image: String(body.image ?? ''),
    price: Number(body.price) || 0,
    mrp: Number(body.mrp) || 0,
    stock: Math.max(0, Math.round(Number(body.stock) || 0)),
    rating: Math.min(5, Math.max(0, Number(body.rating) || 0)),
    reviews: Math.max(0, Math.round(Number(body.reviews) || 0)),
    popular: Boolean(body.popular),
    badge: String(body.badge ?? ''),
    desc: String(body.desc ?? ''),
    features: Array.isArray(body.features) ? body.features.map(String) : [],
    fits: Array.isArray(body.fits) ? body.fits.map(String) : [],
  }
}

async function validateProduct(p, res) {
  if (!p.name) return res.status(400).json({ error: 'Product name is required' })
  if (!p.category) return res.status(400).json({ error: 'Category is required' })
  if (!p.brand) return res.status(400).json({ error: 'Brand is required' })
  const cat = await db.categories.findOne({ _id: p.category })
  if (!cat) return res.status(400).json({ error: `Category "${p.category}" does not exist` })
  return null
}

async function recordMovement(productId, delta, reason, note, session) {
  const opts = session ? { session } : {}
  await db.stock_movements.insertOne(
    {
      _id: await nextId('stock_movements'),
      product_id: productId,
      delta,
      reason: String(reason ?? ''),
      note: String(note ?? ''),
      created_at: now(),
    },
    opts,
  )
}

/* ---------- auth ---------- */

router.get('/auth/status', async (_req, res) => {
  const count = await db.users.countDocuments()
  res.json({ hasUsers: count > 0 })
})

router.post('/auth/register', async (req, res) => {
  try {
    const user = await createUser(req.body?.username, req.body?.password)
    const token = await createSession(user.id)
    res.status(201).json({ ...user, token })
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

router.post('/auth/login', async (req, res) => {
  const username = String(req.body?.username ?? '').trim()
  const password = String(req.body?.password ?? '')
  const user = await db.users.findOne({ username })
  if (!user || !verifyPassword(password, user.salt, user.pass_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }
  const token = await createSession(user._id)
  res.json({ id: user._id, username: user.username, token })
})

router.post('/auth/logout', async (req, res) => {
  await destroySession(adminToken(req))
  res.json({ ok: true })
})

router.get('/auth/me', async (req, res) => {
  const user = await userFromToken(adminToken(req))
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  res.json(user)
})

/* ---------- users ---------- */

router.get('/users', async (_req, res) => {
  const rows = await db.users.find().sort({ _id: 1 }).toArray()
  res.json(rows.map((r) => ({ id: r._id, username: r.username, created_at: r.created_at })))
})

router.post('/users', async (req, res) => {
  try {
    const user = await createUser(req.body?.username, req.body?.password)
    res.status(201).json(user)
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id)
  const target = await db.users.findOne({ _id: id })
  if (!target) return res.status(404).json({ error: 'User not found' })
  const current = await userFromToken(adminToken(req))
  if (current && current.id === id) {
    return res.status(400).json({ error: 'You cannot delete the account you are logged in with' })
  }
  await db.users.deleteOne({ _id: id })
  await db.sessions.deleteMany({ user_id: id })
  res.json({ ok: true })
})

/* ---------- stats ---------- */

router.get('/stats', async (_req, res) => {
  const skus = await db.products.countDocuments()
  const stockAgg = await db.products
    .aggregate([
      { $group: { _id: null, totalStock: { $sum: '$stock' }, stockValue: { $sum: { $multiply: ['$stock', '$price'] } } } },
    ])
    .toArray()
  const { totalStock = 0, stockValue = 0 } = stockAgg[0] || {}
  const lowStock = await db.products.countDocuments({ stock: { $gt: 0, $lt: 10 } })
  const outOfStock = await db.products.countDocuments({ stock: 0 })
  const categoriesCount = await db.categories.countDocuments()

  const movements = await db.stock_movements.find().sort({ _id: -1 }).limit(8).toArray()
  const ids = [...new Set(movements.map((m) => m.product_id))]
  const products = ids.length
    ? await db.products.find({ _id: { $in: ids } }, { projection: { name: 1, part_no: 1 } }).toArray()
    : []
  const byId = new Map(products.map((p) => [p._id, p]))
  const movementsOut = movements.map((m) => ({
    id: m._id,
    product_id: m.product_id,
    product_name: byId.get(m.product_id)?.name || 'Deleted product',
    part_no: byId.get(m.product_id)?.part_no || '',
    delta: m.delta,
    reason: m.reason,
    note: m.note,
    created_at: m.created_at,
  }))

  const orderCount = await db.orders.countDocuments()
  const ordersAgg = await db.orders
    .aggregate([
      { $match: { status: { $ne: 'cancelled' }, payment_status: 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$total' }, items: { $sum: '$item_count' } } },
    ])
    .toArray()
  const { revenue = 0, items: orderItemsCount = 0 } = ordersAgg[0] || {}
  const customersCount = await db.customers.countDocuments()
  const statusCounts = {}
  for (const s of ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']) {
    statusCounts[s] = await db.orders.countDocuments({ status: s })
  }

  res.json({
    skus,
    totalStock,
    stockValue,
    lowStock,
    outOfStock,
    categoriesCount,
    orderCount,
    revenue,
    orderItemsCount,
    customersCount,
    statusCounts,
    movements: movementsOut,
  })
})

/* ---------- products ---------- */

router.get('/products', async (req, res) => {
  const { search, category, brand, status, sort = 'name', limit, offset } = req.query
  const filter = {}
  if (search) {
    const rx = new RegExp(escapeRegExp(search), 'i')
    filter.$or = [{ name: rx }, { part_no: rx }, { brand: rx }]
  }
  if (category) filter.category = category
  if (brand) filter.brand = brand
  if (status === 'low') filter.stock = { $gt: 0, $lt: 10 }
  if (status === 'out') filter.stock = 0
  if (status === 'in') filter.stock = { $gt: 0 }

  const sortMap = {
    name: { name: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    stock_asc: { stock: 1 },
    stock_desc: { stock: -1 },
    updated: { updated_at: -1 },
  }

  const total = await db.products.countDocuments(filter)
  const rows = await db.products
    .find(filter)
    .sort(sortMap[sort] || sortMap.name)
    .skip(Number(offset) || 0)
    .limit(Math.min(Number(limit) || 200, 500))
    .toArray()

  res.json({ total, items: docsOut(rows) })
})

router.get('/products/:id', async (req, res) => {
  const row = await db.products.findOne({ _id: req.params.id })
  if (!row) return res.status(404).json({ error: 'Product not found' })
  res.json(docOut(row))
})

router.post('/products', async (req, res) => {
  const p = serializeProduct(req.body)
  const bad = await validateProduct(p, res)
  if (bad) return bad
  const exists = await db.products.findOne({ _id: p.id })
  if (exists) return res.status(409).json({ error: `Product id "${p.id}" already exists` })
  const ts = now()
  await db.products.insertOne({ _id: p.id, ...p, created_at: ts, updated_at: ts })
  if (p.stock > 0) await recordMovement(p.id, p.stock, 'Initial stock', 'Product created')
  const created = await db.products.findOne({ _id: p.id })
  res.status(201).json(docOut(created))
})

router.put('/products/:id', async (req, res) => {
  const existing = await db.products.findOne({ _id: req.params.id })
  if (!existing) return res.status(404).json({ error: 'Product not found' })
  const p = serializeProduct({ ...existing, ...req.body, id: existing._id })
  const bad = await validateProduct(p, res)
  if (bad) return bad
  await db.products.updateOne(
    { _id: p.id },
    {
      $set: {
        name: p.name,
        category: p.category,
        brand: p.brand,
        part_no: p.part_no,
        image: p.image,
        price: p.price,
        mrp: p.mrp,
        stock: p.stock,
        rating: p.rating,
        reviews: p.reviews,
        popular: p.popular,
        badge: p.badge,
        desc: p.desc,
        features: p.features,
        fits: p.fits,
        updated_at: now(),
      },
    },
  )
  const updated = await db.products.findOne({ _id: p.id })
  res.json(docOut(updated))
})

router.delete('/products/:id', async (req, res) => {
  const result = await db.products.deleteOne({ _id: req.params.id })
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Product not found' })
  await db.stock_movements.deleteMany({ product_id: req.params.id })
  res.json({ ok: true })
})

/* ---------- stock ---------- */

router.post('/products/:id/stock', async (req, res) => {
  const row = await db.products.findOne({ _id: req.params.id }, { projection: { stock: 1 } })
  if (!row) return res.status(404).json({ error: 'Product not found' })

  const delta = Math.round(Number(req.body.delta ?? 0))
  if (!delta || Number.isNaN(delta)) {
    return res.status(400).json({ error: 'delta must be a non-zero integer' })
  }
  const newStock = Math.max(0, row.stock + delta)
  const applied = newStock - row.stock

  await withTx(async (session) => {
    const opts = session ? { session } : {}
    await db.products.updateOne({ _id: row._id }, { $set: { stock: newStock, updated_at: now() } }, opts)
    await recordMovement(row._id, applied, String(req.body.reason || ''), String(req.body.note || ''), session)
  })

  res.json({ id: row._id, previous: row.stock, delta: applied, stock: newStock })
})

/* ---------- stock movements ---------- */

router.get('/stock-movements', async (req, res) => {
  const { productId, limit } = req.query
  const filter = productId ? { product_id: String(productId) } : {}
  const movements = await db.stock_movements
    .find(filter)
    .sort({ _id: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .toArray()
  const ids = [...new Set(movements.map((m) => m.product_id))]
  const products = ids.length
    ? await db.products.find({ _id: { $in: ids } }, { projection: { name: 1, part_no: 1 } }).toArray()
    : []
  const byId = new Map(products.map((p) => [p._id, p]))
  res.json(
    movements.map((m) => ({
      ...docOut(m),
      product_name: byId.get(m.product_id)?.name || 'Deleted product',
      part_no: byId.get(m.product_id)?.part_no || '',
    })),
  )
})

/* ---------- brands ---------- */

router.get('/brands', async (_req, res) => {
  const brands = await db.products.distinct('brand')
  brands.sort((a, b) => a.localeCompare(b))
  res.json(brands)
})

/* ---------- categories ---------- */

router.get('/categories', async (_req, res) => {
  const rows = await db.categories.find().sort({ sort_order: 1, name: 1 }).toArray()
  const out = await Promise.all(
    rows.map(async (c) => ({
      ...docOut(c),
      product_count: await db.products.countDocuments({ category: c._id }),
    })),
  )
  res.json(out)
})

router.post('/categories', async (req, res) => {
  const id = String(req.body.id ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || randomUUID()
  const name = String(req.body.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'Category name is required' })
  const exists = await db.categories.findOne({ _id: id })
  if (exists) return res.status(409).json({ error: 'Category id already exists' })
  const doc = {
    _id: id,
    name,
    short: String(req.body.short ?? name).trim(),
    desc: String(req.body.desc ?? ''),
    icon: String(req.body.icon ?? ''),
    sort_order: Number(req.body.sort_order) || 0,
  }
  await db.categories.insertOne(doc)
  res.status(201).json(docOut(doc))
})

router.put('/categories/:id', async (req, res) => {
  const c = await db.categories.findOne({ _id: req.params.id })
  if (!c) return res.status(404).json({ error: 'Category not found' })
  const next = {
    name: String(req.body.name ?? c.name).trim(),
    short: String(req.body.short ?? c.short).trim(),
    desc: String(req.body.desc ?? c.desc),
    icon: String(req.body.icon ?? c.icon),
    sort_order: Number(req.body.sort_order ?? c.sort_order),
  }
  await db.categories.updateOne({ _id: c._id }, { $set: next })
  res.json(docOut(await db.categories.findOne({ _id: c._id })))
})

router.delete('/categories/:id', async (req, res) => {
  const used = await db.products.countDocuments({ category: req.params.id })
  if (used > 0) return res.status(409).json({ error: `Category is used by ${used} product(s)` })
  const result = await db.categories.deleteOne({ _id: req.params.id })
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Category not found' })
  res.json({ ok: true })
})

/* ---------- vehicles ---------- */

router.get('/vehicles', async (_req, res) => {
  const rows = await db.vehicles.find().sort({ make: 1, model: 1 }).toArray()
  res.json(docsOut(rows))
})

router.post('/vehicles', async (req, res) => {
  const id = String(req.body.id ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || randomUUID()
  const make = String(req.body.make ?? '').trim()
  const model = String(req.body.model ?? '').trim()
  if (!make || !model) return res.status(400).json({ error: 'Make and model are required' })
  const exists = await db.vehicles.findOne({ _id: id })
  if (exists) return res.status(409).json({ error: 'Vehicle id already exists' })
  const doc = { _id: id, make, model, years: String(req.body.years ?? ''), engine: String(req.body.engine ?? '') }
  await db.vehicles.insertOne(doc)
  res.status(201).json(docOut(doc))
})

router.put('/vehicles/:id', async (req, res) => {
  const v = await db.vehicles.findOne({ _id: req.params.id })
  if (!v) return res.status(404).json({ error: 'Vehicle not found' })
  const next = {
    make: String(req.body.make ?? v.make).trim(),
    model: String(req.body.model ?? v.model).trim(),
    years: String(req.body.years ?? v.years),
    engine: String(req.body.engine ?? v.engine),
  }
  await db.vehicles.updateOne({ _id: v._id }, { $set: next })
  res.json(docOut(await db.vehicles.findOne({ _id: v._id })))
})

router.delete('/vehicles/:id', async (req, res) => {
  const used = await db.products.countDocuments({ fits: req.params.id })
  if (used > 0) return res.status(409).json({ error: `Vehicle is used by ${used} product(s) in fitment` })
  const result = await db.vehicles.deleteOne({ _id: req.params.id })
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Vehicle not found' })
  res.json({ ok: true })
})

/* ---------- offers ---------- */

function serializeOffer(body) {
  return {
    id: String(body.id ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || randomUUID(),
    title: String(body.title ?? '').trim(),
    description: String(body.description ?? '').trim(),
    discount_pct: Math.min(90, Math.max(0, Number(body.discount_pct) || 0)),
    image: String(body.image ?? ''),
    product_id: String(body.product_id ?? '').trim(),
    badge: String(body.badge ?? '').trim(),
    active: Boolean(body.active),
    starts_at: String(body.starts_at ?? ''),
    ends_at: String(body.ends_at ?? ''),
    sort_order: Number(body.sort_order) || 0,
  }
}

async function offerProductExists(productId) {
  if (!productId) return true
  return Boolean(await db.products.findOne({ _id: productId }))
}

router.get('/offers', async (_req, res) => {
  const rows = await db.offers.find().sort({ sort_order: 1, created_at: -1 }).toArray()
  res.json(docsOut(rows))
})

router.get('/offers/:id', async (req, res) => {
  const o = await db.offers.findOne({ _id: req.params.id })
  if (!o) return res.status(404).json({ error: 'Offer not found' })
  res.json(docOut(o))
})

router.post('/offers', async (req, res) => {
  const o = serializeOffer(req.body)
  if (!o.title) return res.status(400).json({ error: 'Offer title is required' })
  if (!o.image) return res.status(400).json({ error: 'Offer image is required' })
  if (!(await offerProductExists(o.product_id))) {
    return res.status(400).json({ error: `Product "${o.product_id}" does not exist` })
  }
  const exists = await db.offers.findOne({ _id: o.id })
  if (exists) return res.status(409).json({ error: `Offer id "${o.id}" already exists` })
  const ts = now()
  await db.offers.insertOne({ _id: o.id, ...o, created_at: ts, updated_at: ts })
  res.status(201).json(docOut(await db.offers.findOne({ _id: o.id })))
})

router.put('/offers/:id', async (req, res) => {
  const existing = await db.offers.findOne({ _id: req.params.id })
  if (!existing) return res.status(404).json({ error: 'Offer not found' })
  const o = serializeOffer({ ...existing, ...req.body, id: existing._id })
  if (!o.title) return res.status(400).json({ error: 'Offer title is required' })
  if (!(await offerProductExists(o.product_id))) {
    return res.status(400).json({ error: `Product "${o.product_id}" does not exist` })
  }
  await db.offers.updateOne({ _id: o.id }, { $set: { ...o, updated_at: now() } })
  res.json(docOut(await db.offers.findOne({ _id: o.id })))
})

router.delete('/offers/:id', async (req, res) => {
  const result = await db.offers.deleteOne({ _id: req.params.id })
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Offer not found' })
  res.json({ ok: true })
})

/* ---------- orders (storefront) ---------- */

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

router.get('/orders', async (req, res) => {
  const { status, q, limit, offset } = req.query
  const filter = {}
  if (status && ORDER_STATUSES.includes(status)) filter.status = status
  if (q) {
    const rx = new RegExp(escapeRegExp(String(q)), 'i')
    filter.$or = [{ _id: rx }, { email: rx }, { name: rx }, { phone: String(q) }]
  }
  const total = await db.orders.countDocuments(filter)
  const orders = await listOrders(
    filter,
    { created_at: -1 },
    Math.min(Number(limit) || 50, 200),
    Number(offset) || 0,
  )
  res.json({ total, items: orders })
})

router.get('/orders/:id', async (req, res) => {
  const order = await adminOrderDetail(req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(order)
})

router.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params
  const row = await db.orders.findOne({ _id: id })
  if (!row) return res.status(404).json({ error: 'Order not found' })

  const status = String(req.body?.status ?? '').trim()
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` })
  }
  if (row.status === status) return res.json(await adminOrderDetail(id))

  const note = String(req.body?.note ?? '').trim()
  const at = now()
  const set = { status, updated_at: at }

  const eventNotes = {
    confirmed: 'Order confirmed by admin',
    shipped: 'Dispatched',
    delivered: 'Delivered to customer',
  }
  const defaultNote = eventNotes[status] || 'Status updated'

  if (status === 'shipped') {
    const carrier = String(req.body?.carrier ?? '').trim() || 'SpareXpress Logistics'
    const trackingNumber =
      String(req.body?.trackingNumber ?? '').trim() ||
      `SPX${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
        .toString(36)
        .toUpperCase()}`
    set.carrier = carrier
    set.tracking_number = trackingNumber
  }

  if (status === 'confirmed' && row.payment_status === 'unpaid') {
    set.payment_status = 'paid'
  }
  if (status === 'delivered') {
    set.payment_status = row.payment_status === 'unpaid' ? 'paid' : row.payment_status
  }
  if (status === 'cancelled') {
    set.payment_status = 'refunded'
    await restockOrder(id)
  }

  await db.orders.updateOne({ _id: id }, { $set: set })
  await appendOrderEvent(id, {
    status,
    note: note || defaultNote,
    at,
  })

  res.json(await adminOrderDetail(id))
})

/* ---------- customers (storefront accounts) ---------- */

router.get('/customers', async (req, res) => {
  const { q, limit, offset } = req.query
  const filter = {}
  if (q) {
    const rx = new RegExp(escapeRegExp(String(q)), 'i')
    filter.$or = [{ _id: rx }, { name: rx }, { phone: String(q) }]
  }
  const total = await db.customers.countDocuments(filter)
  const rows = await db.customers
    .find(filter)
    .sort({ created_at: -1 })
    .skip(Number(offset) || 0)
    .limit(Math.min(Number(limit) || 50, 200))
    .toArray()

  const items = await Promise.all(
    rows.map(async (c) => {
      const orders = await db.orders.find({ customer_id: c._id }).toArray()
      const totalSpent = orders.reduce((n, o) => n + (o.total || 0), 0)
      return {
        id: c._id,
        email: c._id,
        name: c.name,
        phone: c.phone,
        addressCount: Array.isArray(c.addresses) ? c.addresses.length : 0,
        orderCount: orders.length,
        totalSpent,
        createdAt: c.created_at,
      }
    }),
  )

  res.json({ total, items })
})

router.get('/customers/:id/orders', async (req, res) => {
  const id = String(req.params.id ?? '')
  const customer = await db.customers.findOne({ _id: id })
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  const orders = await listOrders({ customer_id: id }, { created_at: -1 }, 100, 0)
  res.json({ customer: { id: customer._id, email: customer._id, name: customer.name, phone: customer.phone, createdAt: customer.created_at }, orders })
})

/* ---------- admin ---------- */

router.post('/admin/reseed', async (_req, res) => {
  await reseed()
  const products = await db.products.countDocuments()
  const movements = await db.stock_movements.countDocuments()
  res.json({ ok: true, products, movements })
})

export default router
