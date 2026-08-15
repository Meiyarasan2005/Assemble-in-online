let razorpayScriptPromise = null

export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        razorpayScriptPromise = null
        reject(new Error('Could not load the Razorpay checkout'))
      }
      document.head.appendChild(s)
    })
  }
  return razorpayScriptPromise
}

export function openRazorpayCheckout({ intent, order }) {
  return new Promise((resolve) => {
    const rz = new window.Razorpay({
      key: intent.keyId,
      amount: Math.round(intent.amount * 100),
      currency: 'INR',
      order_id: intent.orderId,
      name: 'SpareXpress',
      description: `Order ${order.id}`,
      prefill: { name: order.name || '', email: order.email, contact: order.phone },
      notes: { order_id: order.id },
      theme: { color: '#ff6a00' },
      handler: (response) => resolve({ response }),
      modal: {
        ondismiss: () => resolve({ dismissed: true }),
      },
    })
    rz.on('payment.failed', () => resolve({ failed: true }))
    rz.open()
  })
}
