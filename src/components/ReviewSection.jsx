import { IconStar, IconCheck } from './icons'

const AVATAR_COLORS = ['#1e88e5', '#43a047', '#8e24aa', '#e53935', '#f4511e', '#00897b', '#5c6bc0', '#d81b60']

function getAvatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function ReviewSection({ reviews = [], rating = 0 }) {
  if (!reviews.length) return null

  const total = reviews.length
  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)

  return (
    <div className="rv-section">
      <div className="rv-header">
        <span className="rv-header-num">{avgRating}</span>
        <span className="rv-header-star">★</span>
        <span className="rv-header-count">{total} Ratings & Reviews</span>
      </div>

      <div className="rv-list">
        {reviews.map((r) => (
          <div key={r.id} className="rv-card">
            <div className="rv-card-left">
              <div className="rv-avatar" style={{ background: getAvatarColor(r.name) }}>
                {r.name[0]}
              </div>
              <span className="rv-name">{r.name}</span>
              {r.verified && (
                <span className="rv-verified">
                  <IconCheck width="11" height="11" /> Certified Buyer
                </span>
              )}
            </div>
            <div className="rv-card-right">
              <div className="rv-card-stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <IconStar key={s} width="12" height="12" className={s <= r.rating ? 'rv-star-on' : 'rv-star-off'} />
                ))}
                <span className="rv-date">{r.date}</span>
              </div>
              <p className="rv-text">{r.text}</p>
              {r.image && (
                <div className="rv-img-row">
                  <img src={r.image} alt="Review" loading="lazy" />
                </div>
              )}
              <div className="rv-actions">
                <button className="rv-like-btn">👍 Yes</button>
                <button className="rv-like-btn">👎 No</button>
                <button className="rv-report-link">Report</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
