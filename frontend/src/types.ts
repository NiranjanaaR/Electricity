export interface Stock {
  id: number;
  ticker: string;
  name: string;
  sector?: string | null;
  currency: string;
  last_fetch_at?: string | null;
  last_error?: string | null;
}

export interface FetchError {
  ticker: string;
  error: string;
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  title: string | null;
  publisher: string | null;
  link: string | null;
  published: string | null;
}

export interface Suggestion {
  id: number;
  analysis_date: string;
  action: "BUY" | "WATCH" | "AVOID";
  confidence: number;
  risk_level: "Low" | "Medium" | "High";
  rsi: number | null;
  sma_20: number | null;
  sma_50: number | null;
  volume_spike: number | null;
  last_close: number | null;
  avg_turnover_nok?: number | null;
  next_earnings_date?: string | null;
  days_to_earnings?: number | null;
  bid?: number | null;
  ask?: number | null;
  spread_pct?: number | null;
  news?: NewsItem[];
  explanation: string;
  stock: Stock;
}

export interface StockDetail {
  stock: Stock;
  prices: PriceBar[];
  suggestion: Suggestion | null;
}
