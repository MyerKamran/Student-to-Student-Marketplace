// SkeletonCard — animated placeholder shown while listings load
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Image placeholder */}
      <div className="skeleton h-48 w-full" />

      <div className="p-4 space-y-3">
        {/* Badges row */}
        <div className="flex justify-between">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>

        {/* Title */}
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />

        {/* Price */}
        <div className="skeleton h-7 w-24 rounded" />

        {/* Seller row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="skeleton h-7 w-7 rounded-full" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
          <div className="skeleton h-4 w-24 rounded" />
        </div>

        {/* Date */}
        <div className="skeleton h-3 w-28 rounded" />
      </div>
    </div>
  );
}

export default SkeletonCard;
