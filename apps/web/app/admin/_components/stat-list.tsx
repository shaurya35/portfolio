/**
 * Ranked label/count rows with a relative-width bar behind the label —
 * enough to see at a glance which entry dominates without pulling in a
 * charting library for what's fundamentally a sorted top-10 list.
 */
export function StatList({
  rows,
  emptyLabel,
}: {
  rows: { label: string; count: number }[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((r) => r.count));

  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <li key={row.label} className="relative">
          <div
            className="absolute inset-y-0 left-0 rounded-sm bg-foreground/[0.06]"
            style={{ width: `${max > 0 ? (row.count / max) * 100 : 0}%` }}
            aria-hidden="true"
          />
          <div className="relative flex items-center justify-between gap-4 px-2 py-1 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {row.count.toLocaleString()}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
