export interface Stock {
  id: number;
  ticker: string;
  name: string;
  sector?: string | null;
  currency: string;
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
  explanation: string;
  stock: Stock;
}

export interface StockDetail {
  stock: Stock;
  prices: PriceBar[];
  suggestion: Suggestion | null;
}
