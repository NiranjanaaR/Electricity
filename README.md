# OsloBørs AI Assistant

A daily technical-analysis dashboard for the Oslo Børs equity market. The
backend pulls **real** historical OHLCV bars from public market-data
providers, computes a small library of indicators (RSI, SMA-20/50, volume
spikes, momentum, volatility) and produces a `BUY` / `WATCH` / `AVOID`
suggestion with a confidence score, risk level, and human-readable
explanation.

> ⚠️ Informational tool. Signals are derived from technical indicators and
> are not investment advice. The app does **not** execute trades.

## Stack

- **Backend** — FastAPI, SQLAlchemy, PostgreSQL, APScheduler, NumPy/pandas.
- **Frontend** — React + TypeScript + Vite, Tailwind CSS, Recharts.

## Data sources

Real market data only — no synthetic fallback. Providers are tried in this
order; the first one that returns valid bars wins. A failure on every
provider is recorded against the stock and surfaced in the UI / API.

| Order | Provider | Auth | Coverage |
| --- | --- | --- | --- |
| 1 | **Yahoo Finance** (`yfinance`) | none | Full Oslo Børs via `.OL` suffix |
| 2 | **AlphaVantage** `TIME_SERIES_DAILY` | `ALPHAVANTAGE_API_KEY` | International incl. Oslo (rate-limited free tier) |
| 3 | **Finnhub** `/stock/candle` | `FINNHUB_API_KEY` | International incl. Oslo (paid tier for OB candles) |

## Stock universe

~80 liquid Oslo Børs tickers across Energy, Financials, Communication
Services, Consumer Staples (incl. seafood), Materials, Industrials,
Shipping, Real Estate, Utilities, IT and Healthcare. Edit
`backend/app/seed_data.py` to add or remove tickers; the analyzer syncs the
DB on every run.

## Running locally

### Docker (Postgres + backend)

```bash
docker compose up --build
```

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api/*` to the backend on port 8000.

The backend triggers an initial market-data fetch in the background on
first launch; with ~80 tickers via Yahoo this typically takes 1–2 minutes.
A scheduled run also fires every day at the configured time
(`SCHEDULE_HOUR` / `SCHEDULE_MINUTE`, default 07:00 Europe/Oslo). You can
trigger one manually at any time:

```bash
curl -X POST http://localhost:8000/api/analysis/run
```

### Bare metal

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL etc.
uvicorn app.main:app --reload
```

If `yfinance` is blocked in your environment, configure one of the API-key
providers in `.env` (`ALPHAVANTAGE_API_KEY` or `FINNHUB_API_KEY`).

## How analysis works

For each ticker the analyzer:

1. Fetches up to `ANALYSIS_LOOKBACK_DAYS` (default 180) of daily OHLCV bars
   from the first provider that responds.
2. Computes:
   - **RSI(14)** — oversold (<30) bullish, overbought (>70) bearish.
   - **SMA-20 / SMA-50** — price above both = uptrend; below both = downtrend.
   - **Volume spike** — today's volume / 20-day average, weighted by direction.
   - **Momentum (10d)** and **20-day volatility** (volatility feeds risk level).
3. Combines the signals into a confidence score (0..1) and an action
   (`BUY ≥ 0.65`, `WATCH ≥ 0.45`, otherwise `AVOID`).
4. Writes a `Suggestion` row with indicator values and a one-line
   explanation.

If data fetching fails, the stock's `last_error` is updated, no suggestion
is generated for that ticker, and the run result includes a `errors[]`
list. The UI shows an "N ticker(s) with fetch errors" panel.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe. |
| `GET` | `/api/stocks?only_errors=true` | Universe, with last fetch state. |
| `GET` | `/api/stocks/{ticker}?days=120` | Price history + latest suggestion. |
| `GET` | `/api/suggestions?action=BUY&risk=Low&limit=20` | Latest suggestion per stock, sorted by confidence. |
| `POST` | `/api/analysis/run` | Trigger an analysis run synchronously. Returns `errors[]`. |

## Configuration

See `backend/.env.example`:

```
DATABASE_URL=postgresql+psycopg2://obxai:obxai@localhost:5432/obxai
ANALYSIS_LOOKBACK_DAYS=180
SCHEDULE_HOUR=7
SCHEDULE_MINUTE=0
TIMEZONE=Europe/Oslo
ALLOW_ORIGINS=http://localhost:5173,http://localhost:3000
ALPHAVANTAGE_API_KEY=
FINNHUB_API_KEY=
```
