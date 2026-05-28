import { useEffect, useState } from "react";
import { api } from "../api";
import type { StockDetail } from "../types";
import StockChart from "./StockChart";
import ActionBadge from "./ActionBadge";
import RiskBadge from "./RiskBadge";
import ConfidenceBar from "./ConfidenceBar";
import IndicatorChips from "./IndicatorChips";

interface Props {
  ticker: string;
}

export default function StockDetailPanel({ ticker }: Props) {
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    api
      .stockDetail(ticker, 120)
      .then((d) => { if (alive) setDetail(d); })
      .catch((e) => { if (alive) setErr(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [ticker]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading {ticker}…</div>;
  }
  if (err || !detail) {
    return <div className="text-sm text-rose-600">Failed to load {ticker}.</div>;
  }

  const { stock, prices, suggestion } = detail;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {stock.ticker} <span className="text-slate-500 font-normal">· {stock.name}</span>
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            {stock.sector ?? "—"} · {stock.currency}
          </div>
        </div>
        {suggestion && (
          <div className="flex items-center gap-2">
            <ActionBadge action={suggestion.action} />
            <RiskBadge risk={suggestion.risk_level} />
          </div>
        )}
      </div>

      {suggestion && (
        <div className="mb-4">
          <ConfidenceBar value={suggestion.confidence} />
          <div className="mt-3">
            <IndicatorChips s={suggestion} />
          </div>
          <p className="text-sm text-slate-700 mt-3 leading-relaxed">
            {suggestion.explanation}
          </p>
        </div>
      )}

      <StockChart prices={prices} />

      {stock.last_fetch_at && (
        <p className="text-[11px] text-slate-400 mt-3">
          Last data fetch: {new Date(stock.last_fetch_at).toLocaleString()}
        </p>
      )}
      {stock.last_error && (
        <p className="text-[11px] text-rose-600 mt-1">
          Last fetch error: {stock.last_error}
        </p>
      )}

      <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
        Signals derived from technical indicators on real daily OHLCV — not
        investment advice. No trades are executed.
      </p>
    </div>
  );
}
