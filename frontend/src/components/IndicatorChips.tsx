import type { Suggestion } from "../types";

function chip(label: string, value: string, tone: "neutral" | "good" | "bad" = "neutral") {
  const colors = {
    neutral: "bg-slate-100 text-slate-700",
    good: "bg-emerald-50 text-emerald-700",
    bad: "bg-rose-50 text-rose-700",
  }[tone];
  return (
    <div className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 ${colors}`} key={label}>
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function IndicatorChips({ s }: { s: Suggestion }) {
  const chips = [];

  if (s.rsi != null) {
    const tone = s.rsi < 30 ? "good" : s.rsi > 70 ? "bad" : "neutral";
    chips.push(chip("RSI", s.rsi.toFixed(1), tone));
  }
  if (s.sma_20 != null && s.last_close != null) {
    const above = s.last_close > s.sma_20;
    chips.push(chip("SMA20", s.sma_20.toFixed(2), above ? "good" : "bad"));
  }
  if (s.sma_50 != null && s.last_close != null) {
    const above = s.last_close > s.sma_50;
    chips.push(chip("SMA50", s.sma_50.toFixed(2), above ? "good" : "bad"));
  }
  if (s.volume_spike != null) {
    const tone = s.volume_spike > 1.5 ? "good" : "neutral";
    chips.push(chip("VOL", `${s.volume_spike.toFixed(2)}×`, tone));
  }
  if (s.last_close != null) {
    chips.push(chip("Close", `${s.last_close.toFixed(2)} NOK`));
  }

  return <div className="flex flex-wrap gap-2">{chips}</div>;
}
