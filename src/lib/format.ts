import type { HourPoint, PriceEntry, RunWindow } from "../types";

export function toHourPoints(entries: PriceEntry[]): HourPoint[] {
  return entries.map((e, i) => {
    const start = new Date(e.time_start);
    const end = new Date(e.time_end);
    const hour = start.getHours();
    return {
      index: i,
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      price: e.NOK_per_kWh,
      start,
      end,
    };
  });
}

export function findCheapestWindow(points: HourPoint[], runHours: number): RunWindow | null {
  if (points.length === 0 || runHours <= 0) return null;
  const span = Math.min(runHours, points.length);
  let bestSum = Infinity;
  let bestStart = 0;
  let windowSum = 0;
  for (let i = 0; i < span; i++) windowSum += points[i].price;
  bestSum = windowSum;
  for (let i = span; i < points.length; i++) {
    windowSum += points[i].price - points[i - span].price;
    if (windowSum < bestSum) {
      bestSum = windowSum;
      bestStart = i - span + 1;
    }
  }
  const endIndex = bestStart + span - 1;
  return {
    startIndex: bestStart,
    endIndex,
    startHour: points[bestStart].hour,
    endHour: (points[endIndex].hour + 1) % 24,
    avgPrice: bestSum / span,
    totalCost: bestSum,
  };
}

export function nokPerKWh(value: number): string {
  return `${(value * 100).toFixed(1)} øre`;
}

export function nokTotal(value: number): string {
  if (value >= 1) return `${value.toFixed(2)} kr`;
  return `${(value * 100).toFixed(0)} øre`;
}

export function hourRange(startHour: number, endHour: number): string {
  return `${String(startHour).padStart(2, "0")}:00 – ${String(endHour).padStart(2, "0")}:00`;
}

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function prettyDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
