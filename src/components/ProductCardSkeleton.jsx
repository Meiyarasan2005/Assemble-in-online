export default function ProductCardSkeleton() {
  return (
    <div className="pcard pcard--skeleton" aria-hidden="true">
      <div className="pcard-art shimmer" />
      <div className="pcard-body">
        <div className="shimmer shimmer--line shimmer--w60" />
        <div className="shimmer shimmer--line shimmer--w90" />
        <div className="shimmer shimmer--line shimmer--w40" />
        <div className="shimmer shimmer--line shimmer--w70" />
        <div className="shimmer shimmer--btn" />
      </div>
    </div>
  )
}
