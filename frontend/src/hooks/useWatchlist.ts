import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "obxai.watchlist";

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
    } catch {
      // localStorage quota / private mode — silent
    }
  }, [tickers]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTickers(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback((t: string) => tickers.includes(t), [tickers]);

  const toggle = useCallback((t: string) => {
    setTickers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }, []);

  const clear = useCallback(() => setTickers([]), []);

  return { tickers, has, toggle, clear };
}
