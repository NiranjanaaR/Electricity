import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../api";
import { useWatchlist } from "../hooks/useWatchlist";

const nav = [
  { to: "/", label: "Suggestions", end: true },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/dashboard", label: "Dashboard" },
];

export default function AppShell() {
  const navigate = useNavigate();
  const { tickers } = useWatchlist();
  const [running, setRunning] = useState(false);
  const [analysisDate, setAnalysisDate] = useState<string | undefined>();

  const runAnalysis = async () => {
    setRunning(true);
    try {
      const r = await api.runAnalysis();
      setAnalysisDate(r.analysis_date);
      navigate(0); // refresh current page data
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-gradient-to-r from-nordic-900 to-nordic-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">
              OB
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                OsloBørs AI Assistant
              </h1>
              <p className="text-xs text-white/70">
                Real OB market data · informational only · no automatic trading
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysisDate && (
              <span className="text-xs text-white/70 hidden sm:inline">
                Last: {analysisDate}
              </span>
            )}
            <button
              onClick={runAnalysis}
              disabled={running}
              className="px-3 py-1.5 rounded-md bg-white text-nordic-900 text-sm font-medium hover:bg-nordic-50 disabled:opacity-50 transition"
            >
              {running ? "Running…" : "Run analysis"}
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 sm:px-6">
          <ul className="flex gap-1 text-sm">
            {nav.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `inline-block px-3 py-2 border-b-2 transition ${
                      isActive
                        ? "border-white text-white"
                        : "border-transparent text-white/70 hover:text-white"
                    }`
                  }
                >
                  {n.label}
                  {n.to === "/watchlist" && tickers.length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-white/20 rounded-full px-1.5 py-0.5">
                      {tickers.length}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-[11px] text-slate-400">
        OsloBørs AI Assistant · technical analysis on real market data · not
        investment advice · no automatic trading
      </footer>
    </div>
  );
}
