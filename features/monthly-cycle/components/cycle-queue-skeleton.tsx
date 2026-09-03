export const CycleQueueSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-live="polite">
    <div className="bg-muted grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <div className="bg-muted h-24 animate-pulse rounded-2xl" key={index} />
      ))}
    </div>
    <div className="bg-muted h-96 animate-pulse rounded-2xl" />
  </div>
);
