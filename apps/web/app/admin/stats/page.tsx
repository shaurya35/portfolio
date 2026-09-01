"use client";

import { useEffect, useMemo, useState } from "react";
import { getStats, type Stats } from "@/app/admin/_lib/api";
import { StatList } from "@/app/admin/_components/stat-list";
import { useAdminError } from "@/app/admin/_lib/use-admin-error";

const RANGES = [7, 30, 90] as const;

/** "2026-09-01" (the backend's `date(created_at)` serialization) -> "Sep 1". */
function formatDayLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function AdminStatsPage() {
  const onError = useAdminError();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await getStats(days);
        if (cancelled) return;
        setStats(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        onError(err, "Failed to load stats.");
        setError("Failed to load stats.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days, onError]);

  const totals = useMemo(() => {
    if (!stats) return null;
    return stats.daily.reduce(
      (acc, day) => ({
        pageviews: acc.pageviews + day.pageviews,
        visitors: acc.visitors + day.visitors,
      }),
      { pageviews: 0, visitors: 0 },
    );
  }, [stats]);

  const maxDailyPageviews = useMemo(
    () => Math.max(1, ...(stats?.daily.map((d) => d.pageviews) ?? [0])),
    [stats],
  );

  return (
    <section className="py-8">
      <div className="pb-8">
        <h1 className="text-2xl font-bold">Stats</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Traffic over the last {days} days.
        </p>
      </div>

      <div className="mb-6 flex gap-1">
        {RANGES.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setDays(range)}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              days === range
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {range}d
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {stats === null && !error ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {stats !== null ? (
        <div className="flex flex-col gap-10">
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {totals?.pageviews.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Pageviews</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {totals?.visitors.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Visitors</p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Daily pageviews
            </h2>
            {stats.daily.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div className="flex h-24 items-stretch gap-0.5">
                {[...stats.daily].reverse().map((day) => (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDate(day.date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    className="relative flex-1"
                  >
                    {hoveredDate === day.date ? (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-background px-2 py-1 text-xs shadow-sm">
                        <p className="font-medium">{formatDayLabel(day.date)}</p>
                        <p className="text-muted-foreground">
                          {day.pageviews.toLocaleString()} views ·{" "}
                          {day.visitors.toLocaleString()} visitors
                        </p>
                      </div>
                    ) : null}
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-sm bg-foreground/15 transition-colors hover:bg-foreground/30"
                      style={{
                        height: `${Math.max(4, (day.pageviews / maxDailyPageviews) * 100)}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Top pages
              </h2>
              <StatList
                rows={stats.top_paths.map((p) => ({ label: p.path, count: p.count }))}
                emptyLabel="No pageviews yet."
              />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Top referrers
              </h2>
              <StatList
                rows={stats.top_referrers.map((r) => ({
                  label: r.referrer,
                  count: r.count,
                }))}
                emptyLabel="No referrers yet — mostly direct traffic."
              />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Countries
              </h2>
              <StatList
                rows={stats.countries.map((c) => ({ label: c.country, count: c.count }))}
                emptyLabel="No country data yet."
              />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Top clicks
              </h2>
              <StatList
                rows={stats.top_targets.map((t) => ({ label: t.target, count: t.count }))}
                emptyLabel="No tracked clicks yet."
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
