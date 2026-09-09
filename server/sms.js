/* Twilio SMS delivery for OTP codes.
   Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM to go live.
   When those env vars are missing, sendSms() reports not-configured so the
   auth endpoints fall back to returning the OTP in the API response (dev). */

export async function sendSms(phone, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!sid || !token || !from) {
    return { delivered: false, reason: 'not-configured' }
  }
  const countryCode = process.env.SMS_COUNTRY_CODE || '91'
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        },
        body: new URLSearchParams({
          To: `+${countryCode}${phone}`,
          From: from,
          Body: message,
        }),
      },
    )
    if (!res.ok) return { delivered: false, reason: `http-${res.status}` }
    return { delivered: true }
  } catch {
    return { delivered: false, reason: 'network' }
  }
}