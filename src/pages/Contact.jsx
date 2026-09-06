import { useState } from 'react'
import { IconPhone, IconWhatsApp, IconMail } from '../components/icons'

const SUPPORT_EMAIL = 'support@assembleonline.in'
const PHONE_DISPLAY = '+91 90033 44069'
const PHONE_TEL = '+919003344069'
const WHATSAPP = 'https://wa.me/9003344069'

function ContactCard({ icon, title, children }) {
  return (
    <div className="contact-card card">
      <span className="contact-card-icon">{icon}</span>
      <strong>{title}</strong>
      <div className="contact-card-body">{children}</div>
    </div>
  )
}

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'Enquiry', message: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      '',
      form.message,
    ].join('\n')
    const subject = encodeURIComponent(form.subject || 'Enquiry')
    const mailBody = encodeURIComponent(body)
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${mailBody}`
  }

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="container">
          <h1>Contact Us</h1>
        </div>
      </section>

      <section className="sec">
        <div className="container">
          <div className="contact-cards">
            <ContactCard icon={<IconPhone width="22" height="22" />} title="Call us">
              <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
              <span>Mon–Sat, 9:00 AM – 7:00 PM IST</span>
            </ContactCard>

            <ContactCard icon={<IconWhatsApp width="22" height="22" />} title="WhatsApp">
              <a href={`${WHATSAPP}?text=${encodeURIComponent('Hello Assemble-on-line, I have a query.')}`} target="_blank" rel="noreferrer">
                Chat with us
              </a>
              <span>Fastest response — usually minutes</span>
            </ContactCard>

            <ContactCard icon={<IconMail width="22" height="22" />} title="Email us">
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              <span>For sales &amp; support</span>
            </ContactCard>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="container">
          <div className="contact-wrap">
            <div className="contact-info">
              <h2>Send us a message</h2>
              <p>
                Fill in the form and we&rsquo;ll open your email app with the
                message ready to send to {SUPPORT_EMAIL}. You can also reach us
                instantly on WhatsApp.
              </p>
              <ul className="contact-info-list">
                <li><IconPhone width="16" height="16" /> {PHONE_DISPLAY}</li>
                <li><IconMail width="16" height="16" /> {SUPPORT_EMAIL}</li>
                <li><IconWhatsApp width="16" height="16" /> WhatsApp: {WHATSAPP.replace('https://wa.me/', '+91 ').replace(/^\+911?0?/, '')}</li>
              </ul>
              <a
                className="btn btn-primary"
                href={`${WHATSAPP}?text=${encodeURIComponent('Hello Assemble-on-line, I have a query.')}`}
                target="_blank"
                rel="noreferrer"
              >
                <IconWhatsApp width="16" height="16" /> Chat on WhatsApp
              </a>
            </div>

            <form className="contact-form card" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="contact-name">Your name</label>
                <input
                  id="contact-name"
                  className="input"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Rakesh Mehta"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="contact-email">Your email</label>
                <input
                  id="contact-email"
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="contact-subject">Subject</label>
                <select
                  id="contact-subject"
                  className="input"
                  value={form.subject}
                  onChange={set('subject')}
                >
                  <option>Enquiry</option>
                  <option>Order support</option>
                  <option>Returns &amp; warranty</option>
                  <option>Bulk / wholesale</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  className="input"
                  rows="5"
                  value={form.message}
                  onChange={set('message')}
                  placeholder="Tell us the part number, your vehicle, or how we can help..."
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Send message
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
