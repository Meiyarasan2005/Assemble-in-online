export const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
]

const dict = {
  searchPlaceholder: {
    en: 'Search part name or number — e.g. 0 986 AB1 238',
    hi: 'पार्ट का नाम या नंबर खोजें — जैसे 0 986 AB1 238',
    mr: 'भागाचे नाव किंवा क्रमांक शोधा — उदा. 0 986 AB1 238',
  },
  search: { en: 'Search', hi: 'खोजें', mr: 'शोधा' },
  myCar: { en: 'My car', hi: 'मेरी कार', mr: 'माझी गाडी' },
  addToCart: { en: 'Add to cart', hi: 'कार्ट में जोड़ें', mr: 'कार्टमध्ये जोडा' },
  outOfStock: { en: 'Out of stock', hi: 'स्टॉक खत्म', mr: 'स्टॉक संपला' },
  checkout: { en: 'Checkout', hi: 'चेकआउट', mr: 'चेकआउट' },
  fitsYourCar: { en: 'Fits your {v}', hi: 'आपकी {v} में फिट', mr: 'तुमच्या {v} मध्ये बसते' },
  notForYourCar: { en: 'Not verified for {v}', hi: '{v} के लिए सत्यापित नहीं', mr: '{v} साठी सत्यापित नाही' },
  checkFitment: { en: 'Check fitment', hi: 'फिटमेंट जांचें', mr: 'फिटमेंट तपासा' },
  compatible: { en: 'Compatible', hi: 'संगत', mr: 'सुसंगत' },
  notCompatible: { en: 'Not compatible', hi: 'संगत नहीं', mr: 'सुसंगत नाही' },
  wishlist: { en: 'Wishlist', hi: 'इच्छा-सूची', mr: 'इच्छा-सूची' },
  orders: { en: 'Orders', hi: 'ऑर्डर', mr: 'ऑर्डर' },
  login: { en: 'Login', hi: 'लॉगिन', mr: 'लॉगिन' },
  priceDropped: { en: 'Price dropped on {n} wishlist item(s)', hi: '{n} इच्छा-सूची आइटम पर कीमत घटी', mr: '{n} इच्छा-सूची वस्तूवर किंमत कमी' },
}

export function t(key, lang = 'en', vars = {}) {
  const row = dict[key]
  if (!row) return key
  let out = row[lang] || row.en
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v))
  }
  return out
}

export function inr(n) {
  return '₹' + new Intl.NumberFormat('en-IN').format(Number(n) || 0)
}
