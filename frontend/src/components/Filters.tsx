interface Props {
  action: string;
  setAction: (v: string) => void;
  risk: string;
  setRisk: (v: string) => void;
}

const btn = (active: boolean) =>
  `text-sm px-3 py-1.5 rounded-md border transition ${
    active
      ? "bg-nordic-700 border-nordic-700 text-white"
      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
  }`;

export default function Filters({ action, setAction, risk, setRisk }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-5">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">Action</span>
        {["", "BUY", "WATCH", "AVOID"].map((a) => (
          <button key={a || "all"} className={btn(action === a)} onClick={() => setAction(a)}>
            {a || "All"}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">Risk</span>
        {["", "Low", "Medium", "High"].map((r) => (
          <button key={r || "all"} className={btn(risk === r)} onClick={() => setRisk(r)}>
            {r || "All"}
          </button>
        ))}
      </div>
    </div>
  );
}
