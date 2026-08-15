import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MongoClient } from 'mongodb'
import {
  categories as seedCategories,
  vehicles as seedVehicles,
  products as seedProducts,
} from '../src/data.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/* ---------- .env loading (no external dependency) ---------- */

const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017'
const DB_NAME = process.env.DB_NAME || 'sparexpress'

export const client = new MongoClient(MONGO_URI, {
  serverSelectionTimeoutMS: 15000,
})

/* `db.products`, `db.orders`, ... -> Mongo collection handles */
const db = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined
      return client.db(DB_NAME).collection(prop)
    },
  },
)

/* ---------- helpers ---------- */

export function now() {
  return new Date().toISOString()
}

/** Atomic auto-increment id (replaces SQLite AUTOINCREMENT). */
export async function nextId(seq) {
  const r = await db.counters.findOneAndUpdate(
    { _id: seq },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  return r.value.value
}

/** Normalize a Mongo doc to the API shape: `_id` -> `id`. */
export function docOut(row) {
  if (!row) return row
  const { _id, ...rest } = row
  return { id: _id, ...rest }
}

export function docsOut(rows) {
  return rows.map(docOut)
}

export function escapeRegExp(s) {
  return String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/* ---------- transactions (fallback for non-replica-set deployments) ---------- */

let txAvailable = true

export async function withTx(fn) {
  if (!txAvailable) return fn(null)
  const session = client.startSession()
  try {
    let out
    await session.withTransaction(async (s) => {
      out = await fn(s)
    })
    return out
  } catch (err) {
    const msg = String(err?.message || '')
    if (
      msg.includes('replica set') ||
      msg.includes('Transaction numbers') ||
      msg.includes('does not support transactions')
    ) {
      txAvailable = false
      return fn(null)
    }
    throw err
  } finally {
    session.endSession()
  }
}

/* ---------- connection ---------- */

export async function connectDb() {
  await client.connect()
  await client.db(DB_NAME).command({ ping: 1 })
}

export function isConnected() {
  return client.topology?.isConnected?.() ?? false
}

/* ---------- seeding ---------- */

export async function seedIfEmpty() {
  const count = await db.products.countDocuments()
  if (count > 0) return false

  const ts = now()
  await db.categories.insertMany(
    seedCategories.map((c, i) => ({
      _id: c.id,
      name: c.name,
      short: c.short,
      desc: c.desc,
      icon: c.icon,
      sort_order: i,
    })),
  )
  await db.vehicles.insertMany(
    seedVehicles.map((v) => ({ _id: v.id, make: v.make, model: v.model, years: v.years, engine: v.engine })),
  )
  await db.products.insertMany(
    seedProducts.map((p) => ({
      _id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand,
      part_no: p.partNo,
      price: p.price,
      mrp: p.mrp,
      stock: p.stock,
      rating: p.rating,
      reviews: p.reviews,
      popular: Boolean(p.popular),
      badge: p.badge || '',
      desc: p.desc,
      features: p.features || [],
      fits: p.fits || [],
      created_at: ts,
      updated_at: ts,
    })),
  )
  if (seedProducts.some((p) => p.stock > 0)) {
    const seeded = seedProducts.filter((p) => p.stock > 0)
    await db.stock_movements.insertMany(
      seeded.map((p, i) => ({
        _id: i + 1,
        product_id: p.id,
        delta: p.stock,
        reason: 'Initial stock',
        note: 'Seeded from catalogue',
        created_at: ts,
      })),
    )
    await db.counters.updateOne(
      { _id: 'stock_movements' },
      { $max: { value: seeded.length } },
      { upsert: true },
    )
  }
  return true
}

export async function reseed() {
  await db.stock_movements.deleteMany({})
  await db.products.deleteMany({})
  await db.vehicles.deleteMany({})
  await db.categories.deleteMany({})
  return seedIfEmpty()
}

export { db }
