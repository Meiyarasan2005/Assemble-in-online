import { useStore } from '../context/useStore'
import { IconCheck } from './icons'

export default function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div className={`toast ${toast ? 'show' : ''}`} role="status">
      <span className="toast-check">
        <IconCheck width="15" height="15" />
      </span>
      {toast}
    </div>
  )
}
