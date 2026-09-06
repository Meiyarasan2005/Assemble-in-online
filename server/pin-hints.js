/* Coarse Indian PIN prefix -> state map. Used only to complete a delivery
   address when the client could not send a state (e.g. older app bundle). */
const PIN_STATE_HINTS = {
  '11': 'Delhi', '12': 'Haryana', '13': 'Haryana', '14': 'Punjab', '15': 'Punjab', '16': 'Punjab',
  '17': 'Himachal Pradesh', '18': 'Jammu and Kashmir', '19': 'Jammu and Kashmir',
  '20': 'Uttar Pradesh', '21': 'Uttar Pradesh', '22': 'Uttar Pradesh', '23': 'Madhya Pradesh',
  '24': 'Uttar Pradesh', '25': 'Uttar Pradesh', '26': 'Uttarakhand', '27': 'Uttar Pradesh',
  '28': 'Uttar Pradesh', '29': 'Rajasthan', '30': 'Rajasthan', '31': 'Rajasthan', '32': 'Rajasthan',
  '33': 'Rajasthan', '34': 'Rajasthan', '40': 'Maharashtra', '41': 'Maharashtra', '42': 'Maharashtra',
  '43': 'Maharashtra', '44': 'Maharashtra', '45': 'Madhya Pradesh', '46': 'Madhya Pradesh',
  '47': 'Madhya Pradesh', '48': 'Madhya Pradesh', '49': 'Chhattisgarh', '50': 'Telangana',
  '51': 'Andhra Pradesh', '52': 'Andhra Pradesh', '53': 'Andhra Pradesh', '54': 'Andhra Pradesh',
  '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka', '59': 'Karnataka',
  '60': 'Tamil Nadu', '61': 'Tamil Nadu', '62': 'Tamil Nadu', '63': 'Tamil Nadu', '64': 'Tamil Nadu',
  '65': 'Tamil Nadu', '66': 'Tamil Nadu', '67': 'Tamil Nadu', '68': 'Tamil Nadu',
  '69': 'Kerala', '70': 'West Bengal', '71': 'West Bengal', '72': 'West Bengal', '73': 'West Bengal',
  '74': 'West Bengal', '75': 'Odisha', '76': 'Odisha', '77': 'Chhattisgarh', '78': 'Assam',
  '79': 'North East', '80': 'Bihar', '81': 'Bihar', '82': 'Bihar', '83': 'Jharkhand', '84': 'Bihar',
  '85': 'Bihar', '86': 'Assam', '88': 'North East', '90': 'Kerala', '93': 'Karnataka',
  '94': 'Karnataka', '95': 'Karnataka', '97': 'Gujarat',
}

export function pinToStateHint(pincode) {
  const d = String(pincode ?? '').replace(/\D/g, '')
  if (!/^\d{6}$/.test(d)) return ''
  return PIN_STATE_HINTS[d.slice(0, 2)] || ''
}