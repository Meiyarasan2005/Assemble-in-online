/* One-off migration: delete email-keyed customer accounts, sessions and
   OTP codes so the site runs phone-only. Orders and order history are kept. */
import { client, db } from '../db.js'

const collections = ['customers', 'customer_sessions', 'otp_codes', 'otp_verified']

for (const name of collections) {
  const count = await db[name].countDocuments()
  if (count > 0) {
    const { deletedCount } = await db[name].deleteMany({})
    console.log(`${name}: removed ${deletedCount}`)
  } else {
    console.log(`${name}: nothing to remove`)
  }
}

await client.close()
console.log('Done.')