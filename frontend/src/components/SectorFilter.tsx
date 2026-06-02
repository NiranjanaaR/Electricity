interface Props {
  sectors: string[];
  active: string;
  onChange: (s: string) => void;
}

export default function SectorFilter({ sectors, active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1">
      <span className="text-xs uppercase tracking-wide text-slate-500 shrink-0">
        Sector
      </span>
      <button
        onClick={() => onChange("")}
        className={`text-xs px-2.5 py-1 rounded-full border transition shrink-0 ${
          active === ""
            ? "bg-nordic-700 border-nordic-700 text-white"
            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
        }`}
      >
        All
      </button>
      {sectors.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`text-xs px-2.5 py-1 rounded-full border transition shrink-0 ${
            active === s
              ? "bg-nordic-700 border-nordic-700 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
