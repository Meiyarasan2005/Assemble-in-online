import { app } from '../server/app.js'
import { ensureDbConnected } from '../server/app.js'

ensureDbConnected().catch(() => {})

export default app