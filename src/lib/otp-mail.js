import emailjs from '@emailjs/browser'

const SERVICE_ID = 'service_eumh0yn'
const TEMPLATE_ID = 'template_qi8q2ko'
const PUBLIC_KEY = 'WEQpxxQ9KIsa_RbgW'

export async function sendOtpEmail({ to_email, otp }) {
  /* Template params must match the EmailJS "One-Time Password" template:
     To Email = {{email}}, code = {{passcode}}, expiry = {{time}}. */
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const time = expiresAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { email: to_email, passcode: otp, time },
    { publicKey: PUBLIC_KEY },
  )
}