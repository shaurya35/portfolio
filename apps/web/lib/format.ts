const MONTH_YEAR: Intl.DateTimeFormatOptions = {
  month: "short",
  year: "numeric",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMonthYear(iso: string): string {
  return new Date(`${iso}-01`).toLocaleDateString("en-US", {
    ...MONTH_YEAR,
    timeZone: "UTC",
  });
}

export function formatRange(start: string, end: string | null): string {
  const startLabel = formatMonthYear(start);
  const endLabel = end ? formatMonthYear(end) : "Present";
  return `${startLabel} – ${endLabel}`;
}
