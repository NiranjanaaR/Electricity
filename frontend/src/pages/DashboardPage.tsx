import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";
import { api } from "../api";
import { useWatchlist } from "../hooks/useWatchlist";
import type { Suggestion, StockDetail } from "../types";

const ACTION_COLORS: Record<string, string> = {
  BUY: "#10b981",
  WATCH: "#f59e0b",
  AVOID: "#94a3b8",
};

const RISK_COLORS: Record<string, string> = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#ef4444",
};

interface SparklineProps {
  ticker: string;
}

function Sparkline({ ticker }: SparklineProps) {
  const [detail, setDetail] = useState<StockDetail | null>(null);
  useEffect(() => {
    let alive = true;
    api.stockDetail(ticker, 60).then((d) => { if (alive) setDetail(d); }).catch(() => {});
    return () => { alive = false; };
  }, [ticker]);
  if (!detail) return <div className="h-12 bg-slate-50 rounded animate-pulse" />;
  const data = detail.prices.map((p) => ({ d: p.date, c: p.close }));
  const first = data[0]?.c ?? 0;
  const last = data[data.length - 1]?.c ?? 0;
  const pct = first ? ((last - first) / first) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-12">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line type="monotone" dataKey="c" stroke={pct >= 0 ? "#10b981" : "#ef4444"} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className={`text-xs font-medium w-14 text-right ${pct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
        {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { tickers } = useWatchlist();
  const [all, setAll] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.suggestions({ limit: 200 })
      .then(setAll)
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo(
    () => all.filter((s) => tickers.includes(s.stock.ticker)),
    [all, tickers]
  );

  const actionData = useMemo(() => {
    const counts: Record<string, number> = { BUY: 0, WATCH: 0, AVOID: 0 };
    items.forEach((s) => { counts[s.action] = (counts[s.action] ?? 0) + 1; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [items]);

  const riskData = useMemo(() => {
    const counts: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
    items.forEach((s) => { counts[s.risk_level] = (counts[s.risk_level] ?? 0) + 1; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [items]);

  const sectorData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((s) => {
      const k = s.stock.sector ?? "Other";
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [items]);

  const avgConfidence = items.length
    ? Math.round((items.reduce((a, s) => a + s.confidence, 0) / items.length) * 100)
    : 0;

  if (tickers.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-slate-500">
        Add some stocks to your watchlist first — the dashboard summarises them.
        <div className="mt-3">
          <Link to="/" className="text-nordic-700 hover:underline">← back to suggestions</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Watchlist dashboard
        <span className="ml-2 text-sm font-normal text-slate-500">
          ({items.length} of {tickers.length} have a current suggestion)
        </span>
      </h2>

      {loading && <div className="text-sm text-slate-500">Loading…</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Stocks" value={items.length} />
        <Stat label="Avg confidence" value={`${avgConfidence}%`} />
        <Stat label="BUY signals" value={actionData.find((d) => d.name === "BUY")?.value ?? 0} tone="good" />
        <Stat label="AVOID signals" value={actionData.find((d) => d.name === "AVOID")?.value ?? 0} tone="bad" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-3 gap-4 mb-6">
        <Card title="Action mix">
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={actionData} dataKey="value" nameKey="name" outerRadius={70} label>
                  {actionData.map((d) => <Cell key={d.name} fill={ACTION_COLORS[d.name] ?? "#cbd5e1"} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Risk distribution">
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" outerRadius={70} label>
                  {riskData.map((d) => <Cell key={d.name} fill={RISK_COLORS[d.name] ?? "#cbd5e1"} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="By sector">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={sectorData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#1f3a55" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="60-day trend per stock">
        <ul className="divide-y divide-slate-100">
          {items.map((s) => (
            <li key={s.stock.ticker} className="py-2 flex items-center gap-4">
              <div className="w-28 shrink-0">
                <Link to={`/stock/${encodeURIComponent(s.stock.ticker)}`} className="text-sm font-medium text-nordic-800 hover:underline">
                  {s.stock.ticker}
                </Link>
                <div className="text-[11px] text-slate-500 truncate">{s.stock.name}</div>
              </div>
              <div className="flex-1">
                <Sparkline ticker={s.stock.ticker} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}
