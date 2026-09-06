import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import routes from './routes.js'
import storeRoutes from './store.js'
import { connectDb, seedIfEmpty } from './db.js'
import { userFromToken } from './auth.js'
import { handleRazorpayWebhook } from './payments.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const app = express()
app.use(cors())

// Razorpay webhook must see the raw request body to verify the signature,
// so mount it before express.json().
app.post(
  '/api/store/payments/razorpay/webhook',
  express.raw({ type: '*/*' }),
  async (req, res) => {
    try {
      await handleRazorpayWebhook(req.body, req.headers['x-razorpay-signature'])
      res.json({ ok: true })
    } catch (e) {
      res.status(e.status || 400).json({ error: e.message })
    }
  },
)

app.use(express.json({ limit: '1mb' }))

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/status']

/* Fast low-level probe: DNS -> TCP -> TLS -> auth. Uses a throwaway client so
   it never touches the shared connection and always returns within ~6s. */
async function diagProbe() {
  const out = {
    mongoUriSet: Boolean(process.env.MONGO_URI),
    dbName: process.env.DB_NAME || 'assembleonline',
    nodeEnv: process.env.NODE_ENV,
    lastDbError,
  }
  const base = process.env.MONGO_URI
  if (!base) return { ...out, ok: false, stage: 'env', error: 'MONGO_URI not set' }
  const { MongoClient } = await import('mongodb')
  const variants = [
    { label: 'orig', uri: base },
    { label: 'direct', uri: `${base}&directConnection=true` },
    { label: 'insecure', uri: `${base}&tlsInsecure=true` },
  ]
  out.variants = []
  for (const v of variants) {
    const c = new MongoClient(v.uri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 2500, retryWrites: false })
    try {
      await c.connect()
      await c.db(out.dbName).command({ ping: 1 })
      out.variants.push({ label: v.label, ok: true })
      out.ok = true
      out.stage = v.label
      break
    } catch (e) {
      const msg = String(e?.message || e)
      let stage = 'other'
      if (/getaddrinfo|ENOTFOUND|EAI_AGAIN|dns/i.test(msg)) stage = 'dns'
      else if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|timed out|connection/i.test(msg)) stage = 'tcp'
      else if (/SASL|auth|Authentication|SCRAM/i.test(msg)) stage = 'auth'
      else if (/TLS|SSL|certificate|handshake|peer|alert/i.test(msg)) stage = 'tls'
      out.variants.push({ label: v.label, ok: false, stage, error: msg.split('\n')[0] })
    } finally {
      await c.close().catch(() => {})
    }
  }
  return out
}

/* Lazy DB connection. On serverless (Vercel) first requests return 503 until
   the connection finishes instead of blocking on a retry loop. Connects again
   automatically when the database comes back. */
let dbReady = false
let dbConnecting = null
let lastDbError = null

export async function ensureDbConnected() {
  if (dbReady) return
  if (!dbConnecting) {
    dbConnecting = connectDb()
      .then(async () => {
        await seedIfEmpty()
        dbReady = true
      })
      .catch((err) => {
        lastDbError = String(err?.message || err).split('\n')[0]
        console.error(`[db] connect failed: ${lastDbError}`)
        throw err
      })
    dbConnecting.finally(() => {
      dbConnecting = null
    })
  }
  return dbConnecting
}

// Fire an early connect so warm instances are ready for the first request.
ensureDbConnected().catch(() => {})

app.use('/api', async (req, res, next) => {
  if (!dbReady) {
    if (req.headers['x-diag'] === '1') {
      const probe = await diagProbe()
      return res.status(probe?.ok ? 200 : 503).json({
        error: probe?.ok ? 'ok' : 'probe failed',
        diag: probe,
      })
    }
    ensureDbConnected().catch(() => {})
    return res.status(503).json({ error: 'Database is connecting, please retry…' })
  }
  next()
})

app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/store')) return next()
  if (PUBLIC_PATHS.includes(req.path)) return next()
  const token = String(req.headers['x-admin-token'] || '')
  const user = await userFromToken(token)
  if (!user) return res.status(401).json({ error: 'Login required' })
  req.user = user
  next()
})

app.use('/api', routes)
app.use('/api/store', storeRoutes)
app.use('/admin', express.static(`${__dirname}/public`))
app.use('/uploads', express.static(`${__dirname}/public/uploads`))
app.get('/', (_req, res) => res.redirect('/admin'))
app.use('/admin', (_req, res) => res.sendFile(`${__dirname}/public/admin.html`))