import { app, ensureDbConnected } from './app.js'
import { seedIfEmpty } from './db.js'
import { razorpayEnabled, razorpayConfig } from './payments.js'

const PORT = process.env.PORT || 4000

async function connectWithRetry() {
  let attempt = 0
  for (;;) {
    attempt++
    try {
      await ensureDbConnected()
      return
    } catch (err) {
      const t = new Date().toISOString().slice(11, 19)
      console.error(`[db] ${t} connect attempt ${attempt} failed: ${err.message.split('\n')[0]}`)
      console.error(`[db] retrying in 10s…`)
      await new Promise((r) => setTimeout(r, 10000))
    }
  }
}

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