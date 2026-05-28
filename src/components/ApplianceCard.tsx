import type { Appliance, HourPoint, RunWindow } from "../types";
import { hourRange, nokPerKWh, nokTotal } from "../lib/format";

interface Props {
  appliance: Appliance;
  window: RunWindow | null;
  points: HourPoint[];
  selected: boolean;
  onSelect: () => void;
}

export function ApplianceCard({ appliance, window: w, points, selected, onSelect }: Props) {
  const cost = w ? w.avgPrice * appliance.kWh * appliance.runHours : 0;
  const startsToday = w ? points[w.startIndex]?.start : null;
  const startsLabel = startsToday
    ? startsToday.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "card text-left p-5 transition-all w-full",
        "hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(27,42,51,0.08)]",
        selected ? "ring-2 ring-nordic-fjord ring-offset-2 ring-offset-nordic-bg" : "",
      ].join(" ")}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl" aria-hidden>
            {appliance.icon}
          </div>
          <div>
            <div className="font-semibold text-nordic-ink">{appliance.name}</div>
            <div className="text-xs text-nordic-muted">{appliance.description}</div>
          </div>
        </div>
        <span className="chip bg-nordic-bg text-nordic-muted">
          {appliance.kWh} kWh · {appliance.runHours}h
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-nordic-muted">Cheapest start</div>
          <div className="mt-0.5 text-lg font-semibold text-nordic-fjordDark">{startsLabel}</div>
          <div className="text-xs text-nordic-muted">
            {w ? hourRange(w.startHour, w.endHour) : ""}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-nordic-muted">Est. cost</div>
          <div className="mt-0.5 text-lg font-semibold text-nordic-moss">
            {w ? nokTotal(cost) : "—"}
          </div>
          <div className="text-xs text-nordic-muted">
            {w ? `${nokPerKWh(w.avgPrice)} avg` : ""}
          </div>
        </div>
      </div>
    </button>
  );
}
