import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Filters from "./components/Filters";
import SuggestionCard from "./components/SuggestionCard";
import StockDetailPanel from "./components/StockDetailPanel";
import { api } from "./api";
import type { Suggestion, Stock } from "./types";

export default function App() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [errorStocks, setErrorStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [risk, setRisk] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, errStocks] = await Promise.all([
        api.suggestions({
          action: action || undefined,
          risk: risk || undefined,
          limit: 50,
        }),
        api.stocks(true),
      ]);
      setSuggestions(data);
      setErrorStocks(errStocks);
      if (!selected && data.length > 0) {
        setSelected(data[0].stock.ticker);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, risk]);

  const runAnalysis = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await api.runAnalysis();
      await load();
      if (result.errors.length > 0) {
        setError(
          `Fetched ${result.suggestions}/${result.analyzed} tickers. ${result.errors.length} fetch failure(s).`
        );
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  const analysisDate = useMemo(
    () => suggestions[0]?.analysis_date,
    [suggestions]
  );

  return (
    <div className="min-h-full bg-slate-50">
      <Header onRunAnalysis={runAnalysis} running={running} analysisDate={analysisDate} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-md px-3 py-2">
          <strong>Real market data.</strong> Suggestions are generated from
          technical indicators (RSI, moving averages, volume) on live daily
          OHLCV from Yahoo Finance with Stooq as a free fallback — no API
          keys required. Not investment advice. The app does <em>not</em>
          place trades.
        </div>

        <Filters action={action} setAction={setAction} risk={risk} setRisk={setRisk} />

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md p-3 mb-4">
            {error}
          </div>
        )}

        {errorStocks.length > 0 && (
          <details className="mb-4 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
            <summary className="cursor-pointer font-medium">
              {errorStocks.length} ticker(s) with fetch errors
            </summary>
            <ul className="mt-2 space-y-1 max-h-40 overflow-auto">
              {errorStocks.map((s) => (
                <li key={s.ticker} className="font-mono">
                  <span className="font-semibold">{s.ticker}</span>
                  <span className="text-amber-700"> — {s.last_error}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-1">
              Top suggestions
            </h2>
            {loading && <div className="text-sm text-slate-500">Loading…</div>}
            {!loading && suggestions.length === 0 && (
              <div className="text-sm text-slate-500">
                No suggestions yet. The first market fetch may still be running —
                try again in a minute, or click <em>Run analysis</em> to trigger
                a fetch.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  s={s}
                  onSelect={setSelected}
                  active={selected === s.stock.ticker}
                />
              ))}
            </div>
          </div>

          <aside className="lg:col-span-1">
            <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-2">
              Details
            </h2>
            {selected ? (
              <StockDetailPanel ticker={selected} />
            ) : (
              <div className="text-sm text-slate-500">
                Pick a stock to see its chart and breakdown.
              </div>
            )}
          </aside>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-[11px] text-slate-400">
        OsloBørs AI Assistant · technical analysis on real market data · not
        investment advice · no automatic trading
      </footer>
    </div>
  );
}
