import { format, subDays } from "date-fns";

export function defaultDateRange(days = 30): { from: string; to: string } {
  const to = new Date();
  const from = subDays(to, days);
  return {
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
  };
}

export function formatPercent(value: number): string {
  return `${Number(value).toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function attendanceColor(rate: number): string {
  if (rate >= 80) return "text-emerald-600";
  if (rate >= 60) return "text-amber-600";
  return "text-destructive";
}
