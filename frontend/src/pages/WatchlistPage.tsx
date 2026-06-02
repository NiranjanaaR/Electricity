import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SuggestionCard from "../components/SuggestionCard";
import { useWatchlist } from "../hooks/useWatchlist";
import { api } from "../api";
import type { Suggestion } from "../types";

export default function WatchlistPage() {
  const { tickers, clear } = useWatchlist();
  const [all, setAll] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .suggestions({ limit: 200 })
      .then(setAll)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo(
    () => all.filter((s) => tickers.includes(s.stock.ticker)),
    [all, tickers]
  );
  const missing = useMemo(
    () => tickers.filter((t) => !all.some((s) => s.stock.ticker === t)),
    [all, tickers]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          My watchlist
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({tickers.length} tracked)
          </span>
        </h2>
        {tickers.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear the entire watchlist?")) clear();
            }}
            className="text-xs text-slate-500 hover:text-rose-600"
          >
            Clear all
          </button>
        )}
      </div>

      {tickers.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-slate-500">
          You haven't added any stocks yet. Open a suggestion and tap the ☆
          to add it here.
          <div className="mt-3">
            <Link to="/" className="text-nordic-700 hover:underline">
              ← back to suggestions
            </Link>
          </div>
        </div>
      )}

      {loading && tickers.length > 0 && (
        <div className="text-sm text-slate-500">Loading…</div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md p-3 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {items.map((s) => (
          <SuggestionCard key={s.id} s={s} />
        ))}
      </div>

      {missing.length > 0 && (
        <details className="mt-6 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
          <summary className="cursor-pointer">
            {missing.length} watched ticker(s) without a current suggestion
          </summary>
          <ul className="mt-2 space-y-1">
            {missing.map((t) => (
              <li key={t} className="font-mono">
                <Link to={`/stock/${encodeURIComponent(t)}`} className="text-nordic-700 hover:underline">
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
