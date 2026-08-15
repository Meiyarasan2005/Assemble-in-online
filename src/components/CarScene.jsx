export function Car() {
  return (
    <svg className="car" viewBox="0 0 340 150" fill="none">
      <defs>
        <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffc247" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffc247" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g className="car-wheels">
        <g className="wheel">
          <circle cx="80" cy="118" r="17" fill="#141414" stroke="#2c2c2c" strokeWidth="3" />
          <g className="wheel-spokes">
            <circle cx="80" cy="118" r="10" stroke="#f3e2c4" strokeWidth="2.5" />
            <path d="M80 108v20M70 118h20M73 111l14 14M87 111l-14 14" stroke="#f3e2c4" strokeWidth="2" />
            <circle cx="80" cy="118" r="3" fill="#e05500" stroke="#ff8a33" strokeWidth="1" />
          </g>
        </g>
        <g className="wheel">
          <circle cx="262" cy="118" r="17" fill="#141414" stroke="#2c2c2c" strokeWidth="3" />
          <g className="wheel-spokes">
            <circle cx="262" cy="118" r="10" stroke="#f3e2c4" strokeWidth="2.5" />
            <path d="M262 108v20M252 118h20M255 111l14 14M269 111l-14 14" stroke="#f3e2c4" strokeWidth="2" />
            <circle cx="262" cy="118" r="3" fill="#e05500" stroke="#ff8a33" strokeWidth="1" />
          </g>
        </g>
      </g>

      <path d="M56 118 A24 24 0 0 1 104 118" stroke="#150a03" strokeWidth="7" fill="none" opacity="0.95" strokeLinecap="round" />
      <path d="M238 118 A24 24 0 0 1 286 118" stroke="#150a03" strokeWidth="7" fill="none" opacity="0.95" strokeLinecap="round" />

      <path
        d="M22 88
           L22 78 Q22 70 32 68
           L56 62
           Q94 50 120 45
           L128 36 Q136 32 146 32
           L176 32 Q186 34 192 40
           L198 48
           Q228 56 252 62
           Q286 68 302 76
           Q313 82 317 90
           L318 98 Q316 105 300 106
           L72 106
           Q38 106 24 98
           Q22 93 22 88 Z"
        fill="#ff6a00"
        stroke="#d94a00"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M30 88
           L44 78 Q58 64 84 62
           Q104 61 120 64
           L240 64
           Q256 61 272 64
           Q290 68 300 80
           L306 96 Q304 104 300 106
           L72 106 Q38 106 24 98
           Q26 92 30 88 Z"
        fill="#e05500"
        stroke="#b84400"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path d="M120 45 L130 35 L176 34 L198 47 Z" fill="#1b2735" stroke="#24110a" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M148 35 L148 47" stroke="#24110a" strokeWidth="2" opacity="0.9" />
      <path d="M122 49 L204 50" stroke="#e8ecf0" strokeWidth="2.5" opacity="0.9" strokeLinecap="round" />
      <path d="M176 40 L198 51" stroke="#ffd9b3" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
      <path d="M126 38 L160 38" stroke="#5f7a92" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />

      <rect x="192" y="40" width="7" height="8" rx="2" fill="#1b2735" stroke="#24110a" strokeWidth="1" />

      <path d="M148 62 L148 104" stroke="#b84400" strokeWidth="2" opacity="0.9" />
      <rect x="153" y="66" width="13" height="4" rx="2" fill="#24110a" />

      <rect x="28" y="102" width="10" height="5" rx="2" fill="#6b6f76" />

      <rect x="106" y="106" width="134" height="6" rx="3" fill="#150a03" />

      <rect x="292" y="88" width="26" height="14" rx="6" fill="#d3d8df" stroke="#9aa1ab" strokeWidth="1.5" />
      <rect x="16" y="86" width="18" height="13" rx="5" fill="#d3d8df" stroke="#9aa1ab" strokeWidth="1.5" />

      <rect x="286" y="74" width="24" height="18" rx="4" fill="#24100a" />
      <path d="M290 80 L306 80 M290 86 L306 86 M290 92 L306 92" stroke="#ffcf9a" strokeWidth="2" />

      <circle cx="278" cy="82" r="7.5" fill="#ffd66b" stroke="#8a5a00" strokeWidth="1.5" />
      <circle cx="276" cy="80" r="2" fill="#fff" />

      <polygon
        className="car-beam"
        points="282,80 322,58 322,102"
        fill="url(#beamGrad)"
      />

      <rect x="24" y="72" width="9" height="5" rx="2" fill="#ff3b3b" />
      <rect x="26" y="73.5" width="5" height="2" rx="1" fill="#ffd66b" opacity="0.8" />

      <text
        x="150"
        y="90"
        textAnchor="middle"
        fill="#ffd9b3"
        fontFamily="JetBrains Mono, monospace"
        fontSize="9"
        letterSpacing="2"
        opacity="0.85"
      >
        SPARE XPRESS
      </text>

      <g className="car-puffs">
        <circle className="puff puff-1" cx="20" cy="112" r="4" fill="#c8ced6" />
        <circle className="puff puff-2" cx="20" cy="112" r="5" fill="#9aa6b5" />
        <circle className="puff puff-3" cx="20" cy="112" r="6" fill="#6b7686" />
      </g>
    </svg>
  )
}

function Skyline() {
  return (
    <svg className="carscene-skyline" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
      <g fill="#131a26">
        <rect x="0" y="70" width="60" height="50" />
        <rect x="66" y="46" width="42" height="74" />
        <rect x="116" y="78" width="70" height="42" />
        <rect x="196" y="54" width="48" height="66" />
        <rect x="252" y="84" width="80" height="36" />
        <rect x="340" y="40" width="56" height="80" />
        <rect x="402" y="70" width="64" height="50" />
        <rect x="472" y="52" width="44" height="68" />
        <rect x="524" y="80" width="90" height="40" />
        <rect x="622" y="58" width="50" height="62" />
        <rect x="680" y="34" width="60" height="86" />
        <rect x="748" y="72" width="72" height="48" />
        <rect x="828" y="50" width="48" height="70" />
        <rect x="884" y="82" width="84" height="38" />
        <rect x="976" y="60" width="52" height="60" />
        <rect x="1036" y="44" width="58" height="76" />
        <rect x="1102" y="76" width="98" height="44" />
      </g>
      <g fill="#ff6a00" opacity="0.5">
        <rect x="196" y="100" width="3" height="20" />
        <rect x="340" y="100" width="3" height="20" />
        <rect x="680" y="100" width="3" height="20" />
        <rect x="1036" y="100" width="3" height="20" />
      </g>
    </svg>
  )
}

function Stars() {
  return (
    <div className="carscene-stars" aria-hidden="true">
      {[
        [6, 24], [15, 10], [27, 30], [38, 8], [50, 22], [62, 14], [74, 28], [86, 12], [95, 26],
      ].map(([x, y], i) => (
        <i key={i} style={{ left: `${x}%`, top: `${y}px`, animationDelay: `${i * 0.6}s` }} />
      ))}
    </div>
  )
}

function ShootingStar() {
  return <div className="carscene-shooting-star" aria-hidden="true" />
}

export default function CarScene() {
  return (
    <section className="carscene" aria-hidden="true">
      <div className="carscene-stage">
        <div className="carscene-horizon" />
        <Stars />
        <ShootingStar />
        <Skyline />
        <div className="carscene-road">
          <div className="carscene-dash" />
        </div>
        <div className="carscene-track">
          <div className="carscene-unit">
            <Car />
            <div className="carscene-trail" />
          </div>
          <div className="carscene-unit">
            <Car />
            <div className="carscene-trail" />
          </div>
        </div>
        <div className="carscene-fog fog-a" />
        <div className="carscene-fog fog-b" />
        <div className="carscene-vignette" />
      </div>
    </section>
  )
}
