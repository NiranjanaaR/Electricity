import type { Suggestion } from "../types";

function fmtNok(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} bn NOK`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} M NOK`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)} k NOK`;
  return `${value.toFixed(0)} NOK`;
}

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

export default function ContextPanel({ s }: { s: Suggestion }) {
  const hasAny =
    s.avg_turnover_nok != null ||
    s.next_earnings_date != null ||
    (s.spread_pct != null && s.bid != null && s.ask != null) ||
    (s.news && s.news.length > 0);

  if (!hasAny) return null;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
        Context
      </h3>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {s.avg_turnover_nok != null && (
          <>
            <dt className="text-slate-500">Avg daily turnover</dt>
            <dd className="text-slate-800 font-medium">
              {fmtNok(s.avg_turnover_nok)}
              {s.avg_turnover_nok < 2_000_000 && (
                <span className="ml-1 text-rose-600">· thin</span>
              )}
            </dd>
          </>
        )}
        {s.bid != null && s.ask != null && (
          <>
            <dt className="text-slate-500">Bid / Ask</dt>
            <dd className="text-slate-800 font-medium">
              {s.bid.toFixed(2)} / {s.ask.toFixed(2)}
              {s.spread_pct != null && (
                <span className="ml-1 text-slate-500">
                  ({s.spread_pct.toFixed(2)}%)
                </span>
              )}
            </dd>
          </>
        )}
        {s.next_earnings_date && (
          <>
            <dt className="text-slate-500">Next earnings</dt>
            <dd className="text-slate-800 font-medium">
              {fmtDate(s.next_earnings_date)}
              {s.days_to_earnings != null && s.days_to_earnings >= 0 && (
                <span
                  className={`ml-1 ${
                    s.days_to_earnings <= 7
                      ? "text-rose-600"
                      : s.days_to_earnings <= 14
                      ? "text-amber-600"
                      : "text-slate-500"
                  }`}
                >
                  ({s.days_to_earnings}d)
                </span>
              )}
            </dd>
          </>
        )}
      </dl>

      {s.news && s.news.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Latest news
          </h4>
          <ul className="space-y-1.5">
            {s.news.slice(0, 5).map((n, i) => (
              <li key={i} className="text-xs">
                {n.link ? (
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-nordic-700 hover:underline"
                  >
                    {n.title}
                  </a>
                ) : (
                  <span className="text-slate-700">{n.title}</span>
                )}
                {(n.publisher || n.published) && (
                  <span className="text-slate-400 ml-1">
                    · {n.publisher}
                    {n.published ? ` · ${fmtDate(n.published)}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
