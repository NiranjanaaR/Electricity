import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "fjord" | "moss" | "ember" | "sun";
}

const accentMap = {
  fjord: "text-nordic-fjordDark",
  moss: "text-nordic-moss",
  ember: "text-nordic-ember",
  sun: "text-nordic-sun",
};

export function StatTile({ label, value, hint, accent = "fjord" }: Props) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-[11px] uppercase tracking-wide text-nordic-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accentMap[accent]}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-nordic-muted">{hint}</div> : null}
    </div>
  );
}
