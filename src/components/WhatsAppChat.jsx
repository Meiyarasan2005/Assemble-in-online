import { useState, useEffect, useRef } from 'react'
import { IconWhatsApp } from './icons'

const PHONE = '9003344069'
const WHATSAPP_LINK = `https://wa.me/${PHONE}`
const DEFAULT_MSG = encodeURIComponent(
  'Hello SPAREXPRESS, I need help with a spare part.',
)

export default function WhatsAppChat() {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!open) return
    boxRef.current?.focus()
  }, [open])

  const quick = [
    'I have a question about a part',
    'I need help finding a spare part',
    'I want to check order status',
    'Bulk / wholesale enquiry',
  ]

  const openChat = (e) => {
    e.stopPropagation()
    const text = encodeURIComponent(msg.trim() || DEFAULT_MSG)
    window.open(`${WHATSAPP_LINK}?text=${text}`, '_blank')
    setSent(true)
    setTimeout(() => setOpen(false), 600)
    setTimeout(() => setSent(false), 2000)
  }

  return (
    <div className={`wa-widget ${open ? 'is-open' : ''}`}>
      {open && (
        <div className="wa-chat card">
          <div className="wa-chat-head">
            <div className="wa-avatar">
              <IconWhatsApp width="20" height="20" />
            </div>
            <div className="wa-chat-head-info">
              <strong>SPAREXPRESS Support</strong>
              <span>Typically replies within minutes</span>
            </div>
            <button className="wa-chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              &times;
            </button>
          </div>

          <div className="wa-chat-body">
            <div className="wa-bubble">
              Hi! 👋 How can we help you today?
              <div className="wa-bubble-time">now</div>
            </div>

            <div className="wa-quick">
              {quick.map((q) => (
                <button
                  key={q}
                  className="wa-quick-chip"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMsg(q)
                    window.open(`${WHATSAPP_LINK}?text=${encodeURIComponent(q)}`, '_blank')
                    setSent(true)
                    setTimeout(() => setOpen(false), 600)
                    setTimeout(() => setSent(false), 2000)
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form
            className="wa-chat-input"
            onSubmit={(e) => {
              e.preventDefault()
              openChat(e)
            }}
          >
            <input
              ref={boxRef}
              type="text"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Type a message..."
              aria-label="WhatsApp message"
            />
            <button type="submit" className="wa-send" aria-label="Send via WhatsApp">
              <span className="wa-send-icon">➤</span>
            </button>
          </form>

          {sent && <div className="wa-notice">Opening WhatsApp…</div>}
        </div>
      )}

      <button className="wa-fab" onClick={() => setOpen((v) => !v)} aria-label="Chat on WhatsApp">
        {open ? (
          <span className="wa-close">×</span>
        ) : (
          <IconWhatsApp width="28" height="28" />
        )}
      </button>
    </div>
  )
}
