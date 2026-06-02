import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StockChart from "../components/StockChart";
import ActionBadge from "../components/ActionBadge";
import RiskBadge from "../components/RiskBadge";
import ConfidenceBar from "../components/ConfidenceBar";
import IndicatorChips from "../components/IndicatorChips";
import ContextPanel from "../components/ContextPanel";
import WatchButton from "../components/WatchButton";
import FinancialsPanel from "../components/FinancialsPanel";
import AiChat from "../components/AiChat";
import { api } from "../api";
import type { StockDetail } from "../types";

export default function StockPage() {
  const { ticker = "" } = useParams<{ ticker: string }>();
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    api.stockDetail(ticker, 250)
      .then((d) => { if (alive) setDetail(d); })
      .catch((e) => { if (alive) setErr(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [ticker]);

  const obUrl = `https://live.euronext.com/en/product/equities/${encodeURIComponent(ticker.replace(".OL", ""))}-NO-XOSL`;
  const yahooUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;

  if (loading) return <div className="text-sm text-slate-500">Loading {ticker}…</div>;
  if (err || !detail) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md p-3">
        Failed to load {ticker}.
        <div className="mt-2">
          <Link to="/" className="text-rose-700 underline">back</Link>
        </div>
      </div>
    );
  }

  const { stock, prices, suggestion } = detail;

  return (
    <div>
      <div className="mb-4">
        <Link to="/" className="text-xs text-slate-500 hover:text-nordic-700">
          ← All suggestions
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              {stock.ticker}
              <WatchButton ticker={stock.ticker} size="md" />
            </h1>
            <div className="text-sm text-slate-700 mt-0.5">{stock.name}</div>
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
            <ContextPanel s={suggestion} />
          </div>
        )}

        <StockChart prices={prices} />

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <a href={obUrl} target="_blank" rel="noopener noreferrer"
             className="text-nordic-700 hover:underline">
            Open on Oslo Børs / Euronext ↗
          </a>
          <a href={yahooUrl} target="_blank" rel="noopener noreferrer"
             className="text-nordic-700 hover:underline">
            Open on Yahoo Finance ↗
          </a>
        </div>

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
      </div>

      <div className="mt-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Financials
        </h2>
        <FinancialsPanel ticker={stock.ticker} />
      </div>

      <div className="mt-5">
        <AiChat ticker={stock.ticker} />
      </div>
    </div>
  );
}
