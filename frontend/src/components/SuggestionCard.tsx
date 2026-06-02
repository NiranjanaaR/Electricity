import { Link } from "react-router-dom";
import type { Suggestion } from "../types";
import ActionBadge from "./ActionBadge";
import RiskBadge from "./RiskBadge";
import ConfidenceBar from "./ConfidenceBar";
import IndicatorChips from "./IndicatorChips";
import WatchButton from "./WatchButton";

interface Props {
  s: Suggestion;
}

export default function SuggestionCard({ s }: Props) {
  return (
    <Link
      to={`/stock/${encodeURIComponent(s.stock.ticker)}`}
      className="block w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-nordic-500 transition shadow-sm hover:shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <ActionBadge action={s.action} />
            <span className="font-semibold text-slate-900">{s.stock.ticker}</span>
            <WatchButton ticker={s.stock.ticker} />
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

      {(s.days_to_earnings != null && s.days_to_earnings <= 14 && s.days_to_earnings >= 0) ||
      (s.avg_turnover_nok != null && s.avg_turnover_nok < 10_000_000) ? (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {s.days_to_earnings != null && s.days_to_earnings <= 14 && s.days_to_earnings >= 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
              📅 Earnings in {s.days_to_earnings}d
            </span>
          )}
          {s.avg_turnover_nok != null && s.avg_turnover_nok < 2_000_000 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
              Thin liquidity
            </span>
          )}
          {s.avg_turnover_nok != null && s.avg_turnover_nok >= 2_000_000 && s.avg_turnover_nok < 10_000_000 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              Modest liquidity
            </span>
          )}
        </div>
      ) : null}

      <p className="text-xs text-slate-600 mt-3 leading-relaxed line-clamp-3">
        {s.explanation}
      </p>
    </Link>
  );
}
