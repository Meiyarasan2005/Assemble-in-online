import { app } from '../server/app.js'
import { ensureDbConnected } from '../server/app.js'

ensureDbConnected().catch(() => {})

// Vercel rewrites /api/(.*) to this function; depending on runtime the
// incoming path may keep the /api prefix or have it stripped. Normalise so
// the Express app (mounted under /api) always matches.
export default function handler(req, res) {
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url}`
    req.originalUrl = req.url
    req.baseUrl = ''
  }
  return app(req, res)
}