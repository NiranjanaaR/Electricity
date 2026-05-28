import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourPoint, RunWindow } from "../types";
import { nokPerKWh } from "../lib/format";

interface Props {
  points: HourPoint[];
  cheapestIndex: number | null;
  expensiveIndex: number | null;
  highlightedWindow?: RunWindow | null;
}

function colorFor(index: number, cheapest: number | null, expensive: number | null): string {
  if (index === cheapest) return "#6FA683";
  if (index === expensive) return "#D88B6A";
  return "#A6CFE2";
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: HourPoint }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-nordic-line bg-white/95 px-3 py-2 shadow-soft text-sm">
      <div className="font-medium text-nordic-ink">{p.label}</div>
      <div className="text-nordic-muted">{nokPerKWh(p.price)} / kWh</div>
    </div>
  );
}

export function PriceChart({ points, cheapestIndex, expensiveIndex, highlightedWindow }: Props) {
  if (points.length === 0) return null;
  const maxPrice = Math.max(...points.map((p) => p.price));
  const yMax = Math.max(0.1, Math.ceil(maxPrice * 100) / 100);

  return (
    <div className="h-72 sm:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#E3E8EC" vertical={false} />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            tick={{ fill: "#5B6E78", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#E3E8EC" }}
          />
          <YAxis
            tick={{ fill: "#5B6E78", fontSize: 11 }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}`}
            tickLine={false}
            axisLine={{ stroke: "#E3E8EC" }}
            domain={[0, yMax]}
            width={48}
            label={{
              value: "øre/kWh",
              angle: -90,
              position: "insideLeft",
              offset: 18,
              style: { fill: "#5B6E78", fontSize: 11 },
            }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(60, 110, 145, 0.06)" }} />
          {highlightedWindow && (
            <ReferenceArea
              x1={points[highlightedWindow.startIndex].label}
              x2={points[highlightedWindow.endIndex].label}
              fill="#6FA683"
              fillOpacity={0.12}
              stroke="#6FA683"
              strokeOpacity={0.4}
              strokeDasharray="3 3"
            />
          )}
          <Bar dataKey="price" radius={[6, 6, 0, 0]}>
            {points.map((p) => (
              <Cell key={p.index} fill={colorFor(p.index, cheapestIndex, expensiveIndex)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
