interface Option {
  label: string;
  value: string;
}

interface Props {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}

export default function Segmented({ label, options, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
        {label}
      </span>
      <div className="inline-flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
        {options.map((o) => (
          <button
            key={o.value || "all"}
            onClick={() => onChange(o.value)}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-md transition ${
              value === o.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
