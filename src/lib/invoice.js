import { inr } from './i18n'

const GST = 0.18

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function invoiceLines(order) {
  const isB2B = order.gstin && order.gstin.trim()
  return `
    <div class="card">
      <h3>Bill To</h3>
      <p>${esc(order.name)}</p>
      <p>${esc(order.address.line1)}${order.address.line2 ? esc(', ' + order.address.line2) : ''}</p>
      <p>${esc(order.address.city)}, ${esc(order.address.state)} — ${esc(order.address.pincode)}</p>
      <p>${esc(order.phone)} · ${esc(order.email)}</p>
      ${isB2B ? `<p>GSTIN: ${esc(order.gstin)}</p>` : ''}
    </div>
    <div class="card">
      <h3>Ship To</h3>
      <p>Same as billing</p>
    </div>
  `
}

export function buildInvoiceHtml(order) {
  const taxable = order.subtotal / (1 + GST)
  const gst = order.subtotal - taxable
  const total = order.total
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Tax Invoice ${esc(order.id)} — SpareXpress</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #10151d; margin: 24px; }
  .inv-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #ff6a00; padding-bottom: 14px; margin-bottom: 18px; }
  .inv-head h1 { margin: 0; font-size: 20px; letter-spacing: 0.06em; }
  .inv-head .sub { color: #666; font-size: 11px; margin-top: 4px; }
  .inv-head .tax { text-align: right; }
  .tax b { font-size: 15px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12.5px; }
  th, td { border: 1px solid #d8dde4; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f4f6f9; }
  .num { text-align: right; white-space: nowrap; }
  .totals { width: 320px; margin-left: auto; }
  .totals td { border: none; padding: 4px 10px; }
  .totals .grand td { border-top: 2px solid #10151d; font-weight: 700; font-size: 14px; }
  .card { border: 1px solid #e2e6ec; border-radius: 6px; padding: 12px 14px; font-size: 12px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 12px 0; }
  .card p { margin: 3px 0; }
  .card h3 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; }
  .foot { margin-top: 20px; font-size: 11px; color: #666; border-top: 1px solid #e2e6ec; padding-top: 10px; }
</style>
</head>
<body>
  <div class="inv-head">
    <div>
      <h1>SPARE<span style="color:#ff6a00">XPRESS</span></h1>
      <div class="sub">Genuine Auto Parts · Retail & Trade Pvt. Ltd.<br />Pune · GSTIN 27AABCS1234X1Z5 · serving all of India</div>
    </div>
    <div class="tax">
      <b>TAX INVOICE</b><br />
      <span>Invoice #${esc(order.id)}</span><br />
      <span>${new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  </div>

  <div class="cols">${invoiceLines(order)}</div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>Part No</th>
        <th>HSN</th>
        <th>Qty</th>
        <th class="num">Rate</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${order.items
        .map(
          (i, idx) => `<tr>
            <td>${idx + 1}</td>
            <td>${esc(i.name)}</td>
            <td>${esc(i.partNo || '—')}</td>
            <td>8708</td>
            <td>${i.qty}</td>
            <td class="num">${inr(i.price)}</td>
            <td class="num">${inr(i.total)}</td>
          </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Taxable value</td><td class="num">${inr(Math.round(taxable))}</td></tr>
    <tr><td>CGST 9%</td><td class="num">${inr(Math.round(gst / 2))}</td></tr>
    <tr><td>SGST 9%</td><td class="num">${inr(Math.round(gst / 2))}</td></tr>
    <tr><td>Delivery</td><td class="num">${order.delivery === 0 ? 'FREE' : inr(order.delivery)}</td></tr>
    <tr class="grand"><td>Total</td><td class="num">${inr(total)}</td></tr>
  </table>

  <div class="foot">
    <strong>Declaration:</strong> This is a computer-generated tax invoice. All parts supplied are new / certified pre-owned as marked and are covered by the SpareXpress warranty at the time of dispatch. For support call +91 93393 32933 or write to billing@sparexpress.in.
  </div>
</body>
</html>`
}

export function downloadInvoice(order) {
  const html = buildInvoiceHtml(order)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SpareXpress-Invoice-${order.id}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const COURIER_TRACK = [
  { match: /delhivery/i, url: (t) => `https://www.delhivery.com/track/package/${encodeURIComponent(t)}` },
  { match: /blue dart|bluedart/i, url: (t) => `https://www.bluedart.com/tracking/Track_Results?tid=${encodeURIComponent(t)}` },
  { match: /dtdc/i, url: (t) => `https://www.dtdc.in/tracking/track.asp?awb=${encodeURIComponent(t)}` },
  { match: /ecom express|ecomexpress/i, url: (t) => `https://www.ecomexpress.in/track_awb.php?awb=${encodeURIComponent(t)}` },
  { match: /india post/i, url: (t) => `https://www.indiapost.gov.in/vas/pages/TrackConsignment.aspx#${encodeURIComponent(t)}` },
]

export function courierUrl(order) {
  if (!order?.trackingNumber) return null
  const carrier = order.carrier || ''
  const hit = COURIER_TRACK.find((c) => c.match.test(carrier))
  return hit ? hit.url(order.trackingNumber) : null
}
