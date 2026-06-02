import type {
  Suggestion, StockDetail, Stock, FetchError, Alert, Financials,
} from "./types";

const BASE = "";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export interface SuggestionsParams {
  action?: string;
  risk?: string;
  limit?: number;
}

export const api = {
  suggestions: (params: SuggestionsParams = {}) => {
    const qs = new URLSearchParams();
    if (params.action) qs.set("action", params.action);
    if (params.risk) qs.set("risk", params.risk);
    if (params.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return jsonFetch<Suggestion[]>(`/api/suggestions${q ? `?${q}` : ""}`);
  },
  stockDetail: (ticker: string, days = 120) =>
    jsonFetch<StockDetail>(`/api/stocks/${encodeURIComponent(ticker)}?days=${days}`),
  stocks: (onlyErrors = false) =>
    jsonFetch<Stock[]>(`/api/stocks${onlyErrors ? "?only_errors=true" : ""}`),
  runAnalysis: () =>
    jsonFetch<{
      analyzed: number;
      suggestions: number;
      analysis_date: string;
      errors: FetchError[];
    }>("/api/analysis/run", { method: "POST" }),
  financials: (ticker: string) =>
    jsonFetch<Financials>(`/api/stocks/${encodeURIComponent(ticker)}/financials`),
  alerts: (params: { days?: number; tickers?: string[] } = {}) => {
    const qs = new URLSearchParams();
    if (params.days) qs.set("days", String(params.days));
    if (params.tickers && params.tickers.length)
      qs.set("tickers", params.tickers.join(","));
    const q = qs.toString();
    return jsonFetch<Alert[]>(`/api/alerts${q ? `?${q}` : ""}`);
  },
  ask: (ticker: string, question: string) =>
    jsonFetch<{ answer: string; model: string }>("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, question }),
    }),
};
