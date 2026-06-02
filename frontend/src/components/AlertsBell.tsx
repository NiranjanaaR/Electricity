import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useWatchlist } from "../hooks/useWatchlist";
import { useAlerts } from "../hooks/useAlerts";

export default function AlertsBell() {
  const { tickers } = useWatchlist();
  const { alerts, unread, markAllRead, requestPermission } = useAlerts(tickers);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          requestPermission();
          if (!open) markAllRead();
        }}
        className="relative px-2 py-1.5 text-white/80 hover:text-white"
        title="Alerts on your watchlist"
        aria-label="Alerts"
      >
        <span className="text-lg">🔔</span>
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg z-20 text-slate-800">
          <div className="px-3 py-2 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            Watchlist alerts ({alerts.length})
          </div>
          {alerts.length === 0 ? (
            <div className="px-3 py-6 text-xs text-slate-500 text-center">
              No action changes on your watchlist in the last 14 days.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <li key={a.id} className="px-3 py-2 hover:bg-slate-50">
                  <Link to={`/stock/${encodeURIComponent(a.stock.ticker)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{a.stock.ticker}</span>
                      <span className="text-[11px] text-slate-500">
                        {a.analysis_date}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5">
                      <span className="text-slate-500">{a.prev_action ?? "—"}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-semibold text-slate-800">{a.new_action}</span>
                      <span className="text-slate-400 ml-2">
                        ({Math.round(a.new_confidence * 100)}%)
                      </span>
                    </div>
                    {a.note && (
                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {a.note}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
