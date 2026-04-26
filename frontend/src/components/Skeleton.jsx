/**
 * Skeleton — Loading placeholders with shimmer.
 */

export function SkeletonCard({ rows = 3, className = '' }) {
  return (
    <div className={`rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 ${className}`}>
      <div className="h-4 w-1/3 rounded-md animate-shimmer mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 rounded-md animate-shimmer mb-2.5" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 h-72 flex items-end gap-2 pb-10">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex-1 rounded-t-md animate-shimmer" style={{ height: `${20 + Math.random() * 60}%` }} />
      ))}
    </div>
  );
}
