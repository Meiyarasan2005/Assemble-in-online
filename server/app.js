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
      try {
        await Promise.race([ensureDbConnected(), new Promise((r) => setTimeout(r, 25000))])
      } catch {}
      const raw = process.env.MONGO_URI || ''
      const masked = raw.replace(/\/\/[^@]*@/, '//***:***@')
      return res.status(dbReady ? 200 : 503).json({
        error: dbReady ? 'ok' : 'Database did not connect within 25s',
        diag: {
          mongoUriSet: Boolean(process.env.MONGO_URI),
          mongoUriMasked: process.env.MONGO_URI ? masked : '(fallback mongodb://localhost:27017)',
          dbName: process.env.DB_NAME || 'assembleonline',
          dbReady,
          lastDbError,
          nodeEnv: process.env.NODE_ENV,
        },
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