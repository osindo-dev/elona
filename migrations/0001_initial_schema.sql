-- Fase 1: initial D1 schema for elona.
-- Scope: stock_summary, broker_summary (aggregate only), broker_master,
-- sector_mapping. See docs/schema-diagram.md for the full rationale and
-- docs/fase-0-findings.md / docs/fase-0-findings-v2.md for why broker
-- data is market-wide aggregate only (no per-stock breakdown available).

-- stock_summary: OHLC + volume/value/frequency + foreign flow,
-- one row per (date, stock_code). Source: IDX GetStockSummary.
-- NOTE: bid/offer (order book) columns intentionally NOT included here.
-- Originally planned for Balance Position Chart, but corrected 2026-07-18
-- (docs/neobdm-competitor-research.md) - that feature is ownership
-- composition (KSEI-sourced, monthly), not a live order book. See
-- ownership_composition table below.
CREATE TABLE stock_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                    -- YYYYMMDD
  stock_code TEXT NOT NULL,
  stock_name TEXT,
  remarks TEXT,

  open_price REAL,
  high_price REAL,
  low_price REAL,
  close_price REAL,
  previous_price REAL,
  change REAL,
  first_trade REAL,

  volume INTEGER,
  value INTEGER,                         -- DEFERRED 2026-07-18: not populated by v1 ingestion (GOAPI has no value field). Nullable, kept for when a source is found.
  frequency INTEGER,                     -- DEFERRED 2026-07-18: same as value, GOAPI has no frequency field.

  -- Foreign investor flow, per stock, per day. Verified structured field
  -- from GetStockSummary (fase 0). This is the data basis for "Top
  -- Accumulation by Investor Type" and "Top Accumulation Foreign".
  foreign_buy INTEGER NOT NULL DEFAULT 0,
  foreign_sell INTEGER NOT NULL DEFAULT 0,
  foreign_net INTEGER GENERATED ALWAYS AS (foreign_buy - foreign_sell) STORED,

  listed_shares INTEGER,
  tradable_shares INTEGER,
  weight_for_index REAL,
  individual_index REAL,

  non_regular_volume INTEGER,
  non_regular_value INTEGER,
  non_regular_frequency INTEGER,

  source_updated_at TEXT,                -- timestamp claimed by IDX response, if any
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (date, stock_code)
);

-- date-first index covers "top movers on date X" style queries (the
-- UNIQUE constraint above already backs this, kept explicit for clarity).
CREATE INDEX idx_stock_summary_date_code ON stock_summary (date, stock_code);
-- stock_code-first index covers "history for stock X" queries (Seasonality
-- Table, Transaction Chart) which UNIQUE(date, stock_code) does not serve well.
CREATE INDEX idx_stock_summary_code_date ON stock_summary (stock_code, date);

-- broker_summary: AGGREGATE ONLY. Market-wide totals per broker per day.
-- Confirmed via docs/fase-0-findings.md and docs/fase-0-findings-v2.md that
-- IDX's public GetBrokerSummary endpoint has NO per-stock breakdown - this
-- table cannot answer "broker X net-buy stock Y". Kept for whatever v1
-- features can use market-wide broker aggregates (see docs/api-contract.md);
-- NOT a data source for Bandarmology/Broker Stalker (those are v2-placeholder).
CREATE TABLE broker_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                    -- YYYYMMDD
  broker_code TEXT NOT NULL,
  broker_name TEXT,
  total_value INTEGER,
  volume INTEGER,
  frequency INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (date, broker_code)
);

CREATE INDEX idx_broker_summary_date_code ON broker_summary (date, broker_code);
CREATE INDEX idx_broker_summary_code_date ON broker_summary (broker_code, date);

-- broker_master: broker registry (code/name/license). Source: IDX
-- participants.getBrokerSearch. Reference/master table, not time-series.
CREATE TABLE broker_master (
  broker_code TEXT PRIMARY KEY,
  broker_name TEXT NOT NULL,
  license TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- sector_mapping: stock_code -> sector/sub-sector/industry classification.
-- Source verified structured via NeaByteLab/IDX-API:
--   ListedCompany/GetCompanyProfilesDetail -> profile.sector / profile.subSector
--   support/stock-screener API -> sector / subSector / industry / subIndustry
-- Reference/master table, not time-series (classification changes rarely;
-- re-synced wholesale rather than versioned per date).
CREATE TABLE sector_mapping (
  stock_code TEXT PRIMARY KEY,
  sector TEXT,
  sub_sector TEXT,
  industry TEXT,
  sub_industry TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sector_mapping_sector ON sector_mapping (sector);

-- ownership_composition: basis for "Balance Position Chart" (corrected
-- meaning, see docs/neobdm-competitor-research.md 2026-07-18 update).
-- This is investor-category ownership breakdown per stock, snapshotted
-- monthly (KSEI cadence, e.g. "Data per 30 jun 2026" as seen in NeoBDM),
-- NOT a daily/real-time order book.
--
-- OPEN ITEM: exact data source and access method for this table is
-- UNVERIFIED. NeoBDM displays it from what looks like an official KSEI
-- XLSX export, but we have not confirmed where/how to obtain that file
-- ourselves, its real column names, or whether it's freely accessible.
-- Column names below are inferred from NeoBDM's UI legend (Foreign/Local
-- x Bank/Insurance/PensionFund/Individual/Corporate/MutualFund/
-- Foundation/Other) - NOT verified against an actual source response.
-- Treat as a placeholder shape to be revised once the source is checked,
-- same discipline as the rest of Fase 0/1/2 findings (don't ship
-- unverified structure as if it were confirmed).
CREATE TABLE ownership_composition (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_code TEXT NOT NULL,
  period TEXT NOT NULL,                  -- YYYY-MM, monthly snapshot

  pct_institution REAL,
  pct_retail REAL,
  pct_foreign REAL,
  free_float_pct REAL,
  scripless_pct REAL,

  source_period_date TEXT,               -- exact date the source snapshot covers, e.g. "2026-06-30"
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (stock_code, period)
);

CREATE INDEX idx_ownership_composition_code_period ON ownership_composition (stock_code, period);
