/** Skeleton shaped like the board, so nothing jumps when it arrives. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14" aria-busy="true" aria-label="Loading drops">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton h-20 w-full max-w-3xl mt-4" />
      <div className="mt-10 grid gap-6">
        <div className="skeleton h-[28rem]" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-72" />
          ))}
        </div>
      </div>
    </div>
  );
}
