export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="h-[68px] bg-card border-b border-hairline" />
      <div className="h-[100px] bg-card border-b border-hairline">
        <div className="max-w-[860px] mx-auto px-8 py-6 max-sm:px-5">
          <div className="h-[52px] bg-bone rounded-[var(--radius-sm)] animate-pulse" />
        </div>
      </div>
      <main className="py-10 pb-[80px]">
        <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
          <div className="grid grid-cols-[1fr_380px] gap-10 items-start max-lg:grid-cols-1">
            <div className="flex flex-col gap-8 max-sm:gap-10">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-6 max-sm:flex-col bg-card rounded-[var(--radius-lg)] overflow-hidden border border-hairline">
                  <div className="w-[280px] shrink-0 max-sm:w-full">
                    <div className="aspect-[5/4] bg-hairline animate-pulse" />
                  </div>
                  <div className="flex flex-col justify-center py-6 pr-5 flex-1 max-sm:py-4 max-sm:px-5 max-sm:pb-6 space-y-3">
                    <div className="h-3 w-24 bg-hairline animate-pulse rounded" />
                    <div className="h-6 w-3/4 bg-hairline animate-pulse rounded" />
                    <div className="h-3 w-1/3 bg-hairline animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-hairline animate-pulse rounded" />
                    <div className="h-5 w-1/3 bg-hairline animate-pulse rounded mt-auto" />
                  </div>
                </div>
              ))}
            </div>
            <div className="sticky top-[80px] space-y-6 max-lg:hidden">
              <div className="bg-card rounded-[var(--radius-lg)] border border-hairline overflow-hidden">
                <div className="w-full aspect-[4/3] bg-hairline animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
