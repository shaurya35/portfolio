// Lives in the (index) route group so it only wraps /writing itself. At
// app/writing/loading.tsx it also wrapped /writing/[slug], including the
// existence check in app/writing/[slug]/layout.tsx, so the response started
// streaming with a 200 before that check could call notFound(): drafts and
// unknown slugs returned HTTP 200 with the not-found page instead of a 404.
export default function Loading() {
  return (
    <section className="py-8">
      <div className="pb-8">
        <h1 className="text-2xl font-bold">Writing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Technical writing on what I&apos;ve actually shipped.
        </p>
      </div>

      <div className="animate-pulse divide-y divide-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 py-5">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-32 rounded bg-muted" />
              <div className="h-3.5 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
