interface Props {
  value: number; // 0..1
}

export default function ConfidenceBar({ value }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const color =
    pct >= 65 ? "bg-emerald-500" : pct >= 45 ? "bg-amber-500" : "bg-slate-400";

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>Confidence</span>
        <span className="font-medium text-slate-700">{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
