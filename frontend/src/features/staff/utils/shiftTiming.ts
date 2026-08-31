export const SHIFT_PRESETS = {
  morning: { start: "09:00", end: "17:00", label: "Morning (9 AM – 5 PM)" },
  evening: { start: "14:00", end: "22:00", label: "Evening (2 PM – 10 PM)" },
} as const;

export function normalizeTimeValue(raw: string): string {
  const parts = String(raw ?? "").trim().split(":");
  if (parts.length < 2) return "";
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Parse stored value like "09:00 - 17:00" into start/end for time inputs. */
export function parseShiftTiming(raw?: string | null): { start: string; end: string } {
  const text = String(raw ?? "").trim();
  if (!text) return { start: "", end: "" };

  const match = text.match(/(\d{1,2}:\d{2})\s*(?:-|–|—|to)\s*(\d{1,2}:\d{2})/i);
  if (match) {
    return {
      start: normalizeTimeValue(match[1]),
      end: normalizeTimeValue(match[2]),
    };
  }

  return { start: "", end: "" };
}

export function formatShiftTiming(start: string, end: string): string {
  const s = normalizeTimeValue(start);
  const e = normalizeTimeValue(end);
  if (!s || !e) return "";
  return `${s} - ${e}`;
}

export function formatShiftTimingDisplay(raw?: string | null): string {
  const { start, end } = parseShiftTiming(raw);
  if (!start || !end) return raw?.trim() || "—";

  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  return `${fmt(start)} – ${fmt(end)}`;
}
