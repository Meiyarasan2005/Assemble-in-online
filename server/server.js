import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import routes from './routes.js'
import storeRoutes from './store.js'
import { connectDb, seedIfEmpty } from './db.js'
import { userFromToken } from './auth.js'
import { handleRazorpayWebhook, razorpayEnabled, razorpayConfig } from './payments.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4000

const app = express()
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

let dbReady = false

async function connectWithRetry() {
  let attempt = 0
  for (;;) {
    attempt++
    try {
      await connectDb()
      dbReady = true
      return
    } catch (err) {
      const t = new Date().toISOString().slice(11, 19)
      console.error(`[db] ${t} connect attempt ${attempt} failed: ${err.message.split('\n')[0]}`)
      console.error(`[db] retrying in 10s…`)
      await new Promise((r) => setTimeout(r, 10000))
    }
  }
}

app.use('/api', async (req, res, next) => {
  if (!dbReady) return res.status(503).json({ error: 'Database is connecting, please retry…' })
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

async function start() {
  app.listen(PORT, () => {
    console.log(`\n  Assemble-on-line Inventory API  ->  http://localhost:${PORT}/api`)
    console.log(`  Storefront API           ->  http://localhost:${PORT}/api/store`)
    console.log(`  Admin tool               ->  http://localhost:${PORT}/admin`)
    if (razorpayEnabled()) {
      console.log(`  Payments                 ->  Razorpay test mode (${razorpayConfig().keyId})`)
    } else {
      console.log('  Payments                 ->  simulated sandbox (set RAZORPAY_KEY_ID/SECRET for real test payments)')
    }
    console.log('  Database                 ->  connecting…')
    console.log('')
  })

  try {
    await connectWithRetry()
    const seeded = await seedIfEmpty()
    console.log(seeded ? '[db] Seeded catalogue into MongoDB' : '[db] Using existing MongoDB data')
    console.log(`  Database                 ->  MongoDB Atlas (${process.env.DB_NAME || 'assembleonline'}) connected`)
    if (seeded) console.log('  Auth: user accounts (login on the admin page)')
  } catch (err) {
    console.error('[db] Could not connect:', err.message.split('\n')[0])
  }
}

start()
