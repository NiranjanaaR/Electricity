interface Props {
  risk: "Low" | "Medium" | "High" | string;
}

const styles: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  High: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function RiskBadge({ risk }: Props) {
  const cls = styles[risk] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {risk} risk
    </span>
  );
}
