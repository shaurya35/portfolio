export default function Loading() {
  return (
    <article className="animate-pulse py-8">
      <div className="h-4 w-28 rounded bg-muted" />

      <div className="mt-6 border-b border-border pb-8">
        <div className="h-5 w-24 rounded-md border border-border bg-muted" />
        <div className="mt-4 h-9 w-3/4 rounded bg-muted" />
        <div className="mt-3 h-5 w-full max-w-md rounded bg-muted" />
        <div className="mt-5 h-4 w-40 rounded bg-muted" />
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
      </div>
    </article>
  );
}
