import { useEffect, useMemo, useState } from "react";
import Filters from "../components/Filters";
import SearchBar from "../components/SearchBar";
import SectorFilter from "../components/SectorFilter";
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
      api.suggestions({ action: action || undefined, risk: risk || undefined, limit: 80 }),
      api.stocks(true),
    ])
      .then(([data, errs]) => {
        setSuggestions(data);
        setErrorStocks(errs);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [action, risk]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    suggestions.forEach((s) => s.stock.sector && set.add(s.stock.sector));
    return Array.from(set).sort();
  }, [suggestions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suggestions.filter((s) => {
      if (sector && s.stock.sector !== sector) return false;
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
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <SearchBar value={query} onChange={setQuery} />
        <Filters action={action} setAction={setAction} risk={risk} setRisk={setRisk} />
        {sectors.length > 0 && (
          <SectorFilter sectors={sectors} active={sector} onChange={setSector} />
        )}
      </div>

      <div className="mb-4 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-md px-3 py-2">
        <strong>Real market data.</strong> Signals from RSI, moving averages,
        volume, liquidity and earnings proximity on live daily OHLCV. Not
        investment advice. No automatic trading.
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

      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">
          {filtered.length} of {suggestions.length} suggestions
        </h2>
      </div>

      {loading && <div className="text-sm text-slate-500">Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-sm text-slate-500">No suggestions match the current filters.</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((s) => (
          <SuggestionCard key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}
