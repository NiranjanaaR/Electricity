import { useMemo } from "react";

interface Props {
  suggestionsBySector: Record<string, number>;
  totalCount: number;
  active: string;
  onChange: (s: string) => void;
}

export default function SectorSidebar({
  suggestionsBySector,
  totalCount,
  active,
  onChange,
}: Props) {
  const sectors = useMemo(
    () =>
      Object.entries(suggestionsBySector).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
      ),
    [suggestionsBySector]
  );

  const Row = ({
    label,
    count,
    value,
  }: {
    label: string;
    count: number;
    value: string;
  }) => {
    const isActive = active === value;
    return (
      <button
        onClick={() => onChange(value)}
        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition ${
          isActive
            ? "bg-nordic-700 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        <span className="truncate text-left">{label}</span>
        <span
          className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
            isActive
              ? "bg-white/20 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile: horizontal scroll fallback */}
      <div className="lg:hidden -mx-1 px-1 overflow-x-auto whitespace-nowrap pb-1">
        <button
          onClick={() => onChange("")}
          className={`inline-block mr-1.5 text-xs px-2.5 py-1 rounded-full border ${
            active === ""
              ? "bg-nordic-700 border-nordic-700 text-white"
              : "bg-white border-slate-200 text-slate-600"
          }`}
        >
          All · {totalCount}
        </button>
        {sectors.map(([s, c]) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`inline-block mr-1.5 text-xs px-2.5 py-1 rounded-full border ${
              active === s
                ? "bg-nordic-700 border-nordic-700 text-white"
                : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            {s} · {c}
          </button>
        ))}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="bg-white border border-slate-200 rounded-xl p-2 sticky top-4">
          <h3 className="text-[11px] uppercase tracking-wide text-slate-500 px-2 py-1.5">
            Sectors
          </h3>
          <div className="space-y-0.5">
            <Row label="All sectors" count={totalCount} value="" />
            {sectors.map(([s, c]) => (
              <Row key={s} label={s} count={c} value={s} />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
