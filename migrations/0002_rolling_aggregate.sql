-- Fase 3: rolling window aggregation (precompute), OHLC+volume (GOAPI) and
-- foreign_net (Sectors.app). See docs/konsep-arsitektur-bandarmology-idx.md
-- section 4.3/4.4 for the precompute + window-size decisions.
--
-- One row per (stock_code, date, window). `date` is the trading day the
-- window ENDS on (inclusive) - e.g. window='5D', date='20260717' means
-- "5 trading days up to and including 2026-07-17".
--
-- No broker_code column: unlike the index-strategy pattern used for
-- broker-keyed tables (see docs/schema-diagram.md), this data has no
-- per-broker breakdown (Bandarmology/Broker Stalker/Broker Summary stay
-- v2-placeholder - see docs/konsep-arsitektur-bandarmology-idx.md
-- section 2). Adjusted per task instruction to drop broker_code from the
-- index strategy where not applicable.
CREATE TABLE stock_rolling_aggregate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_code TEXT NOT NULL,
  date TEXT NOT NULL,                    -- YYYYMMDD, window end date (inclusive)
  window TEXT NOT NULL,                  -- '5D' | '20D' | '60D'

  sample_size INTEGER NOT NULL,          -- actual rows used; < window size if history is short
  avg_close REAL,                        -- rolling mean of close_price
  sum_volume INTEGER,                    -- rolling sum of volume
  sum_foreign_net INTEGER,               -- rolling sum of foreign_net (Rupiah); NULL if no foreign_net rows in window

  last_updated TEXT NOT NULL,            -- ISO 8601, when this row was (re)computed
  staleness_flag TEXT NOT NULL,          -- 'fresh' | 'stale' | 'unknown', see section 4.5
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (stock_code, date, window)
);

-- stock_code-first: primary access pattern for this table is "give me
-- rolling aggregates for stock X as of date Y" (analysis/chart use case).
CREATE INDEX idx_stock_rolling_aggregate_code_date ON stock_rolling_aggregate (stock_code, date);
-- date-first: "all stocks' aggregates on date Y" (screening use case),
-- mirrors the dual-index pattern already used for stock_summary.
CREATE INDEX idx_stock_rolling_aggregate_date_code ON stock_rolling_aggregate (date, stock_code);
