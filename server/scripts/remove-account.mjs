/* Remove a specific customer account by its account key
   (key = <10-digit-phone>@cust.assemble.online for phone accounts).
   Run against the PRODUCTION database by setting MONGO_URI / DB_NAME
   to the Vercel values first, e.g.:
     MONGO_URI="mongodb+srv://..." DB_NAME=assembleonline node server/scripts/remove-account.mjs 9123456789
*/
import { client, db } from '../db.js'

const key = process.argv[2]
if (!key) {
  console.error('Usage: remove-account.mjs <account-key>')
  process.exit(1)
}

const [customers, sessions] = await Promise.all([
  db.customers.deleteOne({ _id: key }),
  db.customer_sessions.deleteMany({ customer_email: key }),
])

console.log(`customers deleted: ${customers.deletedCount}`)
console.log(`sessions deleted: ${sessions.deletedCount}`)
await client.close()