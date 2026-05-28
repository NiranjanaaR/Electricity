import { useEffect, useMemo, useState } from "react";
import { fetchPrices } from "./api/prices";
import { APPLIANCES } from "./data/appliances";
import {
  findCheapestWindow,
  hourRange,
  isoDate,
  nokPerKWh,
  parseIsoDate,
  prettyDate,
  toHourPoints,
} from "./lib/format";
import type { HourPoint, PriceArea } from "./types";
import { PriceChart } from "./components/PriceChart";
import { ApplianceCard } from "./components/ApplianceCard";
import { StatTile } from "./components/StatTile";

const AREAS: { id: PriceArea; label: string }[] = [
  { id: "NO1", label: "NO1 · Oslo" },
  { id: "NO2", label: "NO2 · Kristiansand" },
  { id: "NO3", label: "NO3 · Trondheim" },
  { id: "NO4", label: "NO4 · Tromsø" },
  { id: "NO5", label: "NO5 · Bergen" },
];

export default function App() {
  const [area, setArea] = useState<PriceArea>("NO2");
  const [date, setDate] = useState<Date>(() => new Date());
  const [points, setPoints] = useState<HourPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplianceId, setSelectedApplianceId] = useState<string>(APPLIANCES[0].id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrices(date, area)
      .then((entries) => {
        if (cancelled) return;
        setPoints(toHourPoints(entries));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPoints([]);
        setError(err instanceof Error ? err.message : "Could not load prices.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [area, date]);

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    let cheapest = points[0];
    let expensive = points[0];
    let sum = 0;
    for (const p of points) {
      if (p.price < cheapest.price) cheapest = p;
      if (p.price > expensive.price) expensive = p;
      sum += p.price;
    }
    return {
      cheapest,
      expensive,
      average: sum / points.length,
    };
  }, [points]);

  const windowsByAppliance = useMemo(() => {
    const map: Record<string, ReturnType<typeof findCheapestWindow>> = {};
    for (const a of APPLIANCES) {
      map[a.id] = findCheapestWindow(points, a.runHours);
    }
    return map;
  }, [points]);

  const selectedAppliance = APPLIANCES.find((a) => a.id === selectedApplianceId) ?? APPLIANCES[0];
  const selectedWindow = windowsByAppliance[selectedAppliance.id] ?? null;

  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 1);

  return (
    <div className="min-h-full">
      <header className="border-b border-nordic-line bg-nordic-surface/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-nordic-fjordDark grid place-items-center text-nordic-sun text-lg shadow-soft">
              ⚡
            </div>
            <div>
              <div className="text-base sm:text-lg font-semibold tracking-tight">Strømplan</div>
              <div className="text-xs text-nordic-muted">Norway electricity planner</div>
            </div>
          </div>
          <div className="text-xs text-nordic-muted hidden sm:block">
            Data: hvakosterstrommen.no
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <section className="card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                {prettyDate(date)}
              </h1>
              <p className="text-sm text-nordic-muted">
                Live hourly spot prices · {AREAS.find((a) => a.id === area)?.label}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:items-end gap-3">
              <label className="flex flex-col text-xs text-nordic-muted">
                <span className="mb-1">Region</span>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value as PriceArea)}
                  className="rounded-lg border border-nordic-line bg-white px-3 py-2 text-sm text-nordic-ink focus:outline-none focus:ring-2 focus:ring-nordic-fjord"
                >
                  {AREAS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs text-nordic-muted">
                <span className="mb-1">Date</span>
                <input
                  type="date"
                  value={isoDate(date)}
                  max={isoDate(maxDate)}
                  onChange={(e) => {
                    if (e.target.value) setDate(parseIsoDate(e.target.value));
                  }}
                  className="rounded-lg border border-nordic-line bg-white px-3 py-2 text-sm text-nordic-ink focus:outline-none focus:ring-2 focus:ring-nordic-fjord"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            label="Cheapest hour"
            value={stats ? nokPerKWh(stats.cheapest.price) : "—"}
            hint={stats ? `at ${stats.cheapest.label}` : "Waiting for data"}
            accent="moss"
          />
          <StatTile
            label="Most expensive"
            value={stats ? nokPerKWh(stats.expensive.price) : "—"}
            hint={stats ? `at ${stats.expensive.label}` : "Waiting for data"}
            accent="ember"
          />
          <StatTile
            label="Daily average"
            value={stats ? nokPerKWh(stats.average) : "—"}
            hint="Spot price excl. VAT/grid"
            accent="fjord"
          />
          <StatTile
            label="Hours loaded"
            value={points.length || "—"}
            hint={points.length === 23 ? "DST transition" : points.length === 25 ? "DST transition" : "Per hour, midnight–midnight"}
            accent="sun"
          />
        </section>

        <section className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-semibold text-nordic-ink">Hourly spot price</h2>
            <div className="flex items-center gap-3 text-xs text-nordic-muted">
              <span className="chip bg-emerald-50 text-nordic-moss">
                <span className="h-2 w-2 rounded-full bg-nordic-moss" /> cheapest
              </span>
              <span className="chip bg-orange-50 text-nordic-ember">
                <span className="h-2 w-2 rounded-full bg-nordic-ember" /> peak
              </span>
            </div>
          </div>

          {loading && (
            <div className="h-72 sm:h-80 grid place-items-center text-sm text-nordic-muted">
              Loading prices…
            </div>
          )}
          {!loading && error && (
            <div className="h-72 sm:h-80 grid place-items-center text-sm text-nordic-ember text-center px-6">
              {error}
            </div>
          )}
          {!loading && !error && (
            <PriceChart
              points={points}
              cheapestIndex={stats?.cheapest.index ?? null}
              expensiveIndex={stats?.expensive.index ?? null}
              highlightedWindow={selectedWindow}
            />
          )}

          {selectedWindow && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-nordic-muted">
              <span className="chip bg-nordic-bg text-nordic-fjordDark">
                <span className="h-2 w-2 rounded-full bg-nordic-moss" />
                {selectedAppliance.name}: best window {hourRange(selectedWindow.startHour, selectedWindow.endHour)}
              </span>
              <span>
                avg {nokPerKWh(selectedWindow.avgPrice)} / kWh
              </span>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-end justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="text-sm font-semibold text-nordic-ink">Run your appliances cheaply</h2>
              <p className="text-xs text-nordic-muted">
                Tap an appliance to highlight its best run window on the chart.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {APPLIANCES.map((a) => (
              <ApplianceCard
                key={a.id}
                appliance={a}
                window={windowsByAppliance[a.id] ?? null}
                points={points}
                selected={a.id === selectedApplianceId}
                onSelect={() => setSelectedApplianceId(a.id)}
              />
            ))}
          </div>
        </section>

        <footer className="pt-4 pb-10 text-center text-xs text-nordic-muted">
          Prices are spot prices excluding VAT, grid rent and fees. Source:{" "}
          <a
            className="underline hover:text-nordic-fjordDark"
            href="https://www.hvakosterstrommen.no/strompris-api"
            target="_blank"
            rel="noreferrer"
          >
            hvakosterstrommen.no
          </a>
        </footer>
      </main>
    </div>
  );
}
