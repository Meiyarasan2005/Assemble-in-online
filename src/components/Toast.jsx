import { useStore } from '../context/useStore'
import { IconCheck } from './icons'

export default function Toast() {
  const { toast, setCartOpen } = useStore()
  if (!toast) return null
  return (
    <button
      className={`toast ${toast ? 'show' : ''}`}
      onClick={() => setCartOpen(true)}
    >
      <span className="toast-check">
        <IconCheck width="15" height="15" />
      </span>
      {toast}
      <span className="toast-hint">View cart →</span>
    </button>
  )
}
