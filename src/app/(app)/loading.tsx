export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading this page…</span>
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-surface-raised" />
        <div className="h-8 w-80 max-w-full animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-surface-raised" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-52 animate-pulse rounded-2xl border border-border bg-surface/60 lg:col-span-2" />
        <div className="h-52 animate-pulse rounded-2xl border border-border bg-surface/60" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}
