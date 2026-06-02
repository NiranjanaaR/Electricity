import { useEffect, useMemo, useState } from "react";
import Filters from "../components/Filters";
import SearchBar from "../components/SearchBar";
import SectorSidebar from "../components/SectorSidebar";
import SuggestionCard from "../components/SuggestionCard";
import { api } from "../api";
import type { Suggestion, Stock } from "../types";

export default function HomePage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [errorStocks, setErrorStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [risk, setRisk] = useState("");
  const [sector, setSector] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.suggestions({ action: action || undefined, risk: risk || undefined, limit: 200 }),
      api.stocks(true),
    ])
      .then(([data, errs]) => {
        setSuggestions(data);
        setErrorStocks(errs);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [action, risk]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    suggestions.forEach((s) => {
      const k = s.stock.sector ?? "Other";
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return counts;
  }, [suggestions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suggestions.filter((s) => {
      if (sector && (s.stock.sector ?? "Other") !== sector) return false;
      if (!q) return true;
      return (
        s.stock.ticker.toLowerCase().includes(q) ||
        s.stock.name.toLowerCase().includes(q) ||
        (s.stock.sector ?? "").toLowerCase().includes(q) ||
        s.action.toLowerCase().includes(q) ||
        s.risk_level.toLowerCase().includes(q) ||
        s.explanation.toLowerCase().includes(q)
      );
    });
  }, [suggestions, query, sector]);

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <SectorSidebar
        suggestionsBySector={sectorCounts}
        totalCount={suggestions.length}
        active={sector}
        onChange={setSector}
      />

      <div className="flex-1 min-w-0">
        {/* Toolbar — search and filters in one card */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
            <div className="lg:w-72">
              <SearchBar value={query} onChange={setQuery} />
            </div>
            <div className="flex-1 lg:border-l lg:border-slate-100 lg:pl-5">
              <Filters action={action} setAction={setAction} risk={risk} setRisk={setRisk} />
            </div>
          </div>
        </div>

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

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            {sector ? `${sector}` : "All suggestions"}
            <span className="ml-2 text-xs font-normal text-slate-500">
              {filtered.length} of {suggestions.length}
            </span>
          </h2>
          {(query || sector || action || risk) && (
            <button
              onClick={() => {
                setQuery("");
                setSector("");
                setAction("");
                setRisk("");
              }}
              className="text-xs text-slate-500 hover:text-rose-600"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading && <div className="text-sm text-slate-500">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-slate-500">
            No suggestions match the current filters.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <SuggestionCard key={s.id} s={s} />
          ))}
        </div>

        <p className="text-[11px] text-slate-400 mt-6 leading-relaxed">
          Signals from RSI, moving averages, volume, liquidity and earnings
          proximity on live daily OHLCV. Not investment advice. No automatic
          trading.
        </p>
      </div>
    </div>
  );
}
