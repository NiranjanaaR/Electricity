import type { Suggestion } from "../types";
import ActionBadge from "./ActionBadge";
import RiskBadge from "./RiskBadge";
import ConfidenceBar from "./ConfidenceBar";
import IndicatorChips from "./IndicatorChips";

interface Props {
  s: Suggestion;
  onSelect: (ticker: string) => void;
  active: boolean;
}

export default function SuggestionCard({ s, onSelect, active }: Props) {
  return (
    <button
      onClick={() => onSelect(s.stock.ticker)}
      className={`w-full text-left bg-white border rounded-xl p-4 hover:border-nordic-500 transition shadow-sm hover:shadow ${
        active ? "border-nordic-500 ring-2 ring-nordic-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <ActionBadge action={s.action} />
            <span className="font-semibold text-slate-900">{s.stock.ticker}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {s.stock.name}
            {s.stock.sector ? ` · ${s.stock.sector}` : ""}
          </div>
        </div>
        <RiskBadge risk={s.risk_level} />
      </div>

      <ConfidenceBar value={s.confidence} />

      <div className="mt-3">
        <IndicatorChips s={s} />
      </div>

      <p className="text-xs text-slate-600 mt-3 leading-relaxed line-clamp-3">
        {s.explanation}
      </p>
    </button>
  );
}
