import type { Suggestion, StockDetail, Stock, FetchError } from "./types";

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
};
