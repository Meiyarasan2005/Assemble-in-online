/* Env-gated SMS delivery for OTP codes.
   Configure SMS_API_URL, SMS_API_KEY and SMS_SENDER_ID to go live.
   When they are missing, sendSms() reports not-configured so the
   auth endpoints fall back to returning the OTP in the API response. */

export async function sendSms(phone, message) {
  const url = process.env.SMS_API_URL
  const key = process.env.SMS_API_KEY
  if (!url || !key) {
    return { delivered: false, reason: 'not-configured' }
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'x-api-key': key, Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        mobile: phone,
        message,
        sender: process.env.SMS_SENDER_ID || '',
      }),
    })
    if (!res.ok) {
      return { delivered: false, reason: `http-${res.status}` }
    }
    return { delivered: true }
  } catch {
    return { delivered: false, reason: 'network' }
  }
}