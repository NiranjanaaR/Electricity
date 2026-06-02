import { useEffect, useState } from "react";
import { api } from "../api";
import type { Alert } from "../types";

const SEEN_KEY = "obxai.alertsLastSeen";

function getSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) || "";
  } catch {
    return "";
  }
}

function setSeen(iso: string) {
  try {
    localStorage.setItem(SEEN_KEY, iso);
  } catch {
    /* ignore */
  }
}

/** Poll alerts for the given tickers; surface unread count and fire
 *  browser notifications for any new alerts since lastSeen. */
export function useAlerts(tickers: string[], pollMs = 60_000) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastSeen, setLastSeen] = useState<string>(getSeen);

  useEffect(() => {
    let alive = true;
    if (tickers.length === 0) {
      setAlerts([]);
      return;
    }
    const load = async () => {
      try {
        const data = await api.alerts({ days: 14, tickers });
        if (!alive) return;
        setAlerts(data);

        // Browser notifications for new ones
        const lastSeenTime = lastSeen ? Date.parse(lastSeen) : 0;
        const fresh = data.filter(
          (a) => Date.parse(a.created_at) > lastSeenTime
        );
        if (
          fresh.length > 0 &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          fresh.slice(0, 3).forEach((a) => {
            new Notification(
              `${a.stock.ticker}: ${a.prev_action ?? "?"} → ${a.new_action}`,
              {
                body: a.note ?? "",
                tag: `obxai-${a.id}`,
              }
            );
          });
        }
      } catch {
        /* silent */
      }
    };
    load();
    const id = window.setInterval(load, pollMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers.join(","), pollMs]);

  const unread = alerts.filter(
    (a) => !lastSeen || Date.parse(a.created_at) > Date.parse(lastSeen)
  );

  const markAllRead = () => {
    const now = new Date().toISOString();
    setSeen(now);
    setLastSeen(now);
  };

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
  };

  return { alerts, unread, markAllRead, requestPermission };
}
