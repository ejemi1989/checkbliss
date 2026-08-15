export default function Loading() {
  return (
    <div className="min-h-screen bg-bone animate-pulse">
      <div className="h-[65px] bg-card border-b border-hairline" />
      <div className="max-w-[1240px] mx-auto px-8 py-10">
        <div className="grid grid-cols-[1fr_400px] gap-16 max-lg:grid-cols-1">
          <div className="h-96 bg-bone-secondary rounded-[var(--radius-lg)]" />
          <div className="h-64 bg-bone-secondary rounded-[var(--radius-lg)] max-lg:hidden" />
        </div>
      </div>
    </div>
  );
}
