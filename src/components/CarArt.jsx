const PALETTE = ['#35d0f2', '#ff6a00', '#2ecc8f', '#b49bff', '#ff8b8b', '#ffc247', '#ff9ed2', '#7ec3ff']

const MAKE_COLORS = {
  'Maruti Suzuki': '#35d0f2',
  Hyundai: '#7ec3ff',
  Kia: '#b49bff',
  Tata: '#ff6a00',
  Mahindra: '#2ecc8f',
  Honda: '#ff9ed2',
  Toyota: '#ffc247',
  Ford: '#b49bff',
  Renault: '#ff8b8b',
  Nissan: '#7ec3ff',
  Skoda: '#2ecc8f',
  Volkswagen: '#35d0f2',
  MG: '#ff6a00',
  Jeep: '#ff8b8b',
  'Mercedes-Benz': '#c8d2de',
  Audi: '#ffc247',
  BMW: '#7ec3ff',
  Chevrolet: '#35d0f2',
  Citroën: '#ff9ed2',
}

function pickPalette(make) {
  let h = 0
  for (const ch of String(make)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export default function CarArt({ make = '', className = '', large = false }) {
  const color = MAKE_COLORS[make] || pickPalette(make)
  return (
    <div
      className={`car-art ${large ? 'car-art--large' : ''} ${className}`}
      style={{ '--car-color': color }}
      role="img"
      aria-label={make ? `${make} car` : 'Car'}
    >
      <svg viewBox="0 0 200 120" aria-hidden="true">
        <defs>
          <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--car-color)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--car-color)" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <path
          d="M12 110 10 94 C8 82 16 76 24 72 C42 58 48 52 62 50 L134 50 C152 50 160 60 168 76 C178 82 190 88 192 98 L193 110 Z"
          fill="url(#car-body)"
          stroke="var(--car-color)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M68 55 L126 55 C142 55 150 64 156 74 L76 74 Z"
          fill="var(--car-color)"
          opacity="0.28"
          stroke="var(--car-color)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M100 74 L100 106" stroke="var(--car-color)" strokeWidth="1.5" opacity="0.5" />
        <path d="M64 74 L64 102" stroke="var(--car-color)" strokeWidth="1.5" opacity="0.35" />
        <path d="M138 74 L138 102" stroke="var(--car-color)" strokeWidth="1.5" opacity="0.35" />
        <circle cx="46" cy="100" r="14" fill="var(--surface)" stroke="var(--car-color)" strokeWidth="3" />
        <circle cx="46" cy="100" r="5" fill="var(--car-color)" />
        <circle cx="152" cy="100" r="14" fill="var(--surface)" stroke="var(--car-color)" strokeWidth="3" />
        <circle cx="152" cy="100" r="5" fill="var(--car-color)" />
        <path
          d="M8 110 H192"
          stroke="var(--car-color)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
          strokeDasharray="4 8"
        />
      </svg>
    </div>
  )
}
