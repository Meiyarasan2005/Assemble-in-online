import nodemailer from 'nodemailer'

function cfg() {
  return {
    host: String(process.env.SMTP_HOST ?? '').trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true',
    user: String(process.env.SMTP_USER ?? '').trim(),
    pass: String(process.env.SMTP_PASS ?? ''),
    from: String(process.env.SMTP_FROM ?? process.env.MAIL_FROM ?? '').trim(),
  }
}

export function smtpConfigured() {
  const c = cfg()
  return Boolean(c.host && c.user && c.pass && c.host !== '')
}

let transporter = null

async function getTransporter() {
  if (!transporter) {
    const c = cfg()
    transporter = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.secure,
      auth: { user: c.user, pass: c.pass },
    })
  }
  return transporter
}

export async function sendMail({ to, subject, text, html }) {
  const c = cfg()
  await getTransporter().sendMail({
    from: c.from || `Assemble-on-line <${c.user}>`,
    to,
    subject,
    text,
    html,
  })
}

export async function sendOtpMail({ to, otp, expiresMinutes = 15 }) {
  const subject = 'OTP for your Assemble-on-line authentication'
  const text =
    `Your Assemble-on-line verification code is ${otp}.\n\n` +
    `It is valid for the next ${expiresMinutes} minutes. ` +
    `Do not share this code with anyone.\n\n` +
    `If you did not request this code, you can safely ignore this email.`
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">` +
    `<h2 style="margin:0 0 6px;color:#0c1016">Assemble-on-line</h2>` +
    `<p style="margin:0 0 18px;color:#6b7280;font-size:14px">Your verification code</p>` +
    `<div style="background:#f3f4f6;border-radius:10px;padding:18px;text-align:center">` +
    `<span style="font-size:30px;font-weight:700;letter-spacing:6px;color:#0c1016">${otp}</span>` +
    `</div>` +
    `<p style="color:#374151;font-size:14px;line-height:1.55;margin:16px 0 0">` +
    `Enter this code to finish creating your account. It is valid for the next ` +
    `<strong>${expiresMinutes} minutes</strong>. Do not share it with anyone.</p>` +
    `<p style="color:#9ca3af;font-size:12px;line-height:1.5;margin-top:20px">` +
    `If you did not request this code, you can safely ignore this email.</p>` +
    `</div>`
  await sendMail({ to, subject, text, html })
}