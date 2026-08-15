import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { db, nextId, now } from './db.js'

const TOKEN_BYTES = 24
const SALT_BYTES = 16
const HASH_BYTES = 64

export function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES).toString('hex')
  const hash = scryptSync(String(password), salt, HASH_BYTES)
  return { salt, hash: hash.toString('hex') }
}

export function verifyPassword(password, salt, hash) {
  try {
    const candidate = scryptSync(String(password), salt, HASH_BYTES)
    const expected = Buffer.from(String(hash), 'hex')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

export async function createSession(userId) {
  const token = randomBytes(TOKEN_BYTES).toString('base64url')
  await db.sessions.insertOne({ _id: token, user_id: userId, created_at: now() })
  return token
}

export async function destroySession(token) {
  if (token) await db.sessions.deleteOne({ _id: token })
}

export async function userFromToken(token) {
  if (!token) return null
  const session = await db.sessions.findOne({ _id: token })
  if (!session) return null
  const user = await db.users.findOne({ _id: session.user_id })
  if (!user) return null
  return { id: user._id, username: user.username, created_at: user.created_at }
}

export async function createUser(username, password) {
  const name = String(username ?? '').trim()
  const pass = String(password ?? '')
  if (name.length < 3) throw Object.assign(new Error('Username must be at least 3 characters'), { status: 400 })
  if (pass.length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 })
  const exists = await db.users.findOne({ username: name })
  if (exists) throw Object.assign(new Error('Username already taken'), { status: 409 })
  const { salt, hash } = hashPassword(pass)
  const id = await nextId('users')
  await db.users.insertOne({ _id: id, username: name, pass_hash: hash, salt, created_at: now() })
  return { id, username: name }
}
