import emailjs from '@emailjs/browser'

const SERVICE_ID = 'service_eumh0yn'
const TEMPLATE_ID = 'template_qi8q2ko'
const PUBLIC_KEY = 'WEQpxxQ9KIsa_RbgW'

export async function sendOtpEmail({ to_email, otp }) {
  return emailjs.send(SERVICE_ID, TEMPLATE_ID, { to_email, otp }, { publicKey: PUBLIC_KEY })
}