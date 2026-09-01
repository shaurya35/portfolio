"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiRequestError, getStats, type Stats } from "@/app/admin/_lib/api";
import { LogoutButton } from "@/app/admin/_components/logout-button";
import { StatList } from "@/app/admin/_components/stat-list";

const RANGES = [7, 30, 90] as const;

export default function AdminStatsPage() {
  const router = useRouter();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (err instanceof ApiRequestError && err.status === 401) {
          router.replace("/admin");
          return;
        }
        setError("Failed to load stats.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days, router]);

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
      <div className="flex items-center justify-between pb-8">
        <div>
          <h1 className="text-2xl font-bold">Stats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Traffic over the last {days} days.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/posts"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Posts
          </Link>
          <LogoutButton />
        </div>
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
              <div className="flex h-24 items-end gap-0.5">
                {[...stats.daily].reverse().map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.pageviews} pageviews, ${day.visitors} visitors`}
                    className="flex-1 rounded-t-sm bg-foreground/15 transition-colors hover:bg-foreground/30"
                    style={{
                      height: `${Math.max(4, (day.pageviews / maxDailyPageviews) * 100)}%`,
                    }}
                  />
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
