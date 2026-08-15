export default function BgFX() {
  return (
    <div className="bgfx" aria-hidden="true">
      <div className="bgfx-orb orb-1" />
      <div className="bgfx-orb orb-2" />
      <div className="bgfx-orb orb-3" />
      {Array.from({ length: 16 }, (_, i) => (
        <i
          key={i}
          className="bgfx-p"
          style={{
            left: `${(i * 6.4 + 2) % 100}%`,
            top: `${(i * 13.7 + 5) % 100}%`,
            animationDelay: `${i * 0.9}s`,
            animationDuration: `${11 + (i % 5) * 2.4}s`,
          }}
        />
      ))}
    </div>
  )
}
