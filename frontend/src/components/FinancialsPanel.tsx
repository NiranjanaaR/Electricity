import { useEffect, useState } from "react";
import { api } from "../api";
import type { Financials, EarningsPoint, EarningsHistoryPoint } from "../types";

function fmtMoney(value: number | null, currency: string): string {
  if (value == null || !isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B ${currency}`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M ${currency}`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(0)}k ${currency}`;
  return `${value.toFixed(2)} ${currency}`;
}

function EarningsTable({ rows, currency, title }: {
  rows: EarningsPoint[]; currency: string; title: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">
        {title}
      </h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left font-normal py-1">Period</th>
            <th className="text-right font-normal py-1">Revenue</th>
            <th className="text-right font-normal py-1">Earnings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-1 text-slate-700">{r.date ?? "—"}</td>
              <td className="py-1 text-right text-slate-800">
                {fmtMoney(r.revenue, currency)}
              </td>
              <td className={`py-1 text-right ${
                r.earnings != null && r.earnings < 0 ? "text-rose-600" : "text-slate-800"
              }`}>
                {fmtMoney(r.earnings, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ rows }: { rows: EarningsHistoryPoint[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">
        EPS estimate vs actual
      </h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left font-normal py-1">Quarter</th>
            <th className="text-right font-normal py-1">Est.</th>
            <th className="text-right font-normal py-1">Actual</th>
            <th className="text-right font-normal py-1">Surprise</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-1 text-slate-700">{r.quarter ?? r.period ?? "—"}</td>
              <td className="py-1 text-right text-slate-700">
                {r.estimate?.toFixed(2) ?? "—"}
              </td>
              <td className="py-1 text-right text-slate-800">
                {r.actual?.toFixed(2) ?? "—"}
              </td>
              <td className={`py-1 text-right ${
                r.surprise_pct == null
                  ? "text-slate-500"
                  : r.surprise_pct >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}>
                {r.surprise_pct != null
                  ? `${r.surprise_pct >= 0 ? "+" : ""}${r.surprise_pct.toFixed(1)}%`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FinancialsPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    api
      .financials(ticker)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setErr(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [ticker]);

  if (loading) {
    return (
      <div className="text-xs text-slate-500">Loading financials…</div>
    );
  }
  if (err) {
    return (
      <div className="text-xs text-rose-600">
        Could not load financials: {err}
      </div>
    );
  }

  const hasAny =
    data &&
    ((data.quarterly_earnings?.length ?? 0) > 0 ||
      (data.annual_earnings?.length ?? 0) > 0 ||
      (data.earnings_history?.length ?? 0) > 0);

  if (!hasAny) {
    return (
      <div className="text-xs text-slate-500">
        No financials returned by Yahoo for this ticker.
      </div>
    );
  }

  const cur = data!.currency || "NOK";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <EarningsTable rows={data!.quarterly_earnings} currency={cur} title="Quarterly" />
      <EarningsTable rows={data!.annual_earnings} currency={cur} title="Annual" />
      <div className="sm:col-span-2">
        <HistoryTable rows={data!.earnings_history} />
      </div>
    </div>
  );
}
