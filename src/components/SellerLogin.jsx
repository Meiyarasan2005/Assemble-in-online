import { useState } from 'react'
import { useSeller } from '../context/useSeller'
import { IconX } from './icons'

export default function SellerLogin({ onClose }) {
  const { login } = useSeller()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      onClose()
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="seller-overlay" onClick={onClose}>
      <div className="seller-modal" onClick={(e) => e.stopPropagation()}>
        <div className="seller-modal-head">
          <h2>Seller Login</h2>
          <button className="icon-btn" onClick={onClose}><IconX width="20" height="20" /></button>
        </div>
        <form className="seller-form" onSubmit={handleSubmit}>
          {error && <div className="seller-error">{error}</div>}
          <label className="seller-label">
            Username
            <input
              className="seller-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label className="seller-label">
            Password
            <input
              className="seller-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="btn btn-primary seller-btn" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login as Seller'}
          </button>
        </form>
      </div>
    </div>
  )
}
