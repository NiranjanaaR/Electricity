# OsloBørs AI Assistant

A daily technical-analysis dashboard for Oslo Børs stocks. The backend pulls
historical OHLCV data, computes a small library of indicators (RSI, SMA-20/50,
volume spikes, momentum, volatility) and produces a `BUY` / `WATCH` / `AVOID`
suggestion with a confidence score, risk level, and human-readable explanation.

> ⚠️ **Educational use only.** Suggestions are derived from technical signals
> and are not investment advice. The app does **not** execute trades.

## Stack

- **Backend** — FastAPI, SQLAlchemy, PostgreSQL, APScheduler, NumPy/pandas,
  yfinance for data (with a deterministic synthetic-data fallback so the app
  works in sandboxed environments without internet).
- **Frontend** — React + TypeScript + Vite, Tailwind CSS, Recharts.

## Layout

```
backend/   FastAPI service + analyzer + scheduler
frontend/  React + Tailwind dashboard
docker-compose.yml  Postgres + backend
```

## Running locally

### Option A — Docker (Postgres + backend)

```bash
docker compose up --build
```

Then in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api/*` to the
backend on port 8000.

### Option B — Bare metal (uses SQLite fallback if Postgres isn't running)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=sqlite:///./obxai.db   # or your Postgres URL
uvicorn app.main:app --reload
```

```bash
cd frontend
npm install
npm run dev
```

## How analysis works

For each ticker in `backend/app/seed_data.py` the analyzer:

1. Fetches up to `ANALYSIS_LOOKBACK_DAYS` (default 180) of daily OHLCV bars.
2. Computes:
   - **RSI(14)** — oversold (<30) is treated as bullish, overbought (>70) bearish.
   - **SMA-20 / SMA-50** — price above both = uptrend; below both = downtrend.
   - **Volume spike** — today's volume / 20-day average, weighted by the day's
     direction.
   - **Momentum (10d)** and **20-day volatility** (the latter feeds the risk
     level).
3. Combines the signals into a confidence score (0..1) and an action
   (`BUY ≥ 0.65`, `WATCH ≥ 0.45`, otherwise `AVOID`).
4. Writes a `Suggestion` row with the indicator values and a one-line
   explanation.

The scheduler re-runs the analysis daily at the time configured by
`SCHEDULE_HOUR` / `SCHEDULE_MINUTE` (default 07:00 Europe/Oslo). You can also
trigger a run manually:

```bash
curl -X POST http://localhost:8000/api/analysis/run
```

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe. |
| `GET` | `/api/stocks` | List the tracked ticker universe. |
| `GET` | `/api/stocks/{ticker}?days=120` | Price history + latest suggestion. |
| `GET` | `/api/suggestions?action=BUY&risk=Low&limit=20` | Latest suggestion per stock, sorted by confidence. |
| `POST` | `/api/analysis/run` | Trigger an analysis run synchronously. |

## Configuration

See `backend/.env.example`:

```
DATABASE_URL=postgresql+psycopg2://obxai:obxai@localhost:5432/obxai
ANALYSIS_LOOKBACK_DAYS=180
SCHEDULE_HOUR=7
SCHEDULE_MINUTE=0
TIMEZONE=Europe/Oslo
ALLOW_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Data sources & fallback

Live prices are fetched through `yfinance` using the `.OL` suffix used by
Yahoo Finance for Oslo Børs listings. When the network is unreachable, the
backend falls back to a deterministic synthetic OHLCV series seeded from the
ticker, so the app remains demoable end-to-end.
