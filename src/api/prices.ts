import type { PriceArea, PriceEntry } from "../types";

const BASE_URL = "https://www.hvakosterstrommen.no/api/v1/prices";

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function buildPricesUrl(date: Date, area: PriceArea): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${BASE_URL}/${year}/${month}-${day}_${area}.json`;
}

export async function fetchPrices(date: Date, area: PriceArea): Promise<PriceEntry[]> {
  const url = buildPricesUrl(date, area);
  const res = await fetch(url);
  if (res.status === 404) {
    throw new Error(
      "Prices for this day aren't published yet. Tomorrow's prices are usually released around 13:00 CET."
    );
  }
  if (!res.ok) {
    throw new Error(`Failed to load prices (${res.status})`);
  }
  return (await res.json()) as PriceEntry[];
}
