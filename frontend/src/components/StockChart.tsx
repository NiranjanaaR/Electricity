import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { PriceBar } from "../types";

interface Props {
  prices: PriceBar[];
  sma20?: number | null;
  sma50?: number | null;
}

function computeSMA(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      out.push(null);
    } else {
      const slice = values.slice(i - window + 1, i + 1);
      out.push(slice.reduce((a, b) => a + b, 0) / window);
    }
  }
  return out;
}

export default function StockChart({ prices }: Props) {
  const closes = prices.map((p) => p.close);
  const sma20 = computeSMA(closes, 20);
  const sma50 = computeSMA(closes, 50);

  const data = prices.map((p, i) => ({
    date: p.date,
    close: p.close,
    volume: p.volume,
    sma20: sma20[i],
    sma50: sma50[i],
  }));

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={32} />
          <YAxis yAxisId="price" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
          <YAxis yAxisId="volume" orientation="right" tick={{ fontSize: 11 }} hide />
          <Tooltip
            formatter={(value: number | string, name: string) => {
              if (name === "Volume") return [Math.round(Number(value)).toLocaleString(), name];
              return [Number(value).toFixed(2), name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="volume" dataKey="volume" fill="#cbd5e1" name="Volume" />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke="#1f3a55"
            strokeWidth={2}
            dot={false}
            name="Close"
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="sma20"
            stroke="#0ea5e9"
            strokeWidth={1.5}
            dot={false}
            name="SMA 20"
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="sma50"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            name="SMA 50"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
