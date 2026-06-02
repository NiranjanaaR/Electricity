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
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
        {label}
      </span>
      <div className="inline-flex bg-slate-100 rounded-lg p-1 gap-0.5">
        {options.map((o) => (
          <button
            key={o.value || "all"}
            onClick={() => onChange(o.value)}
            className={`text-sm font-medium px-3.5 py-1.5 rounded-md transition ${
              value === o.value
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60"
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
