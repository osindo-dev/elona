// PLACEHOLDER subset, not the full ~900-stock IDX universe. Kris decided
// (2026-07-19) to start ingestion with a small sample rather than solving
// full-market coverage now - that needs a stock list source
// (sector_mapping ingestion) which does not exist yet, out of scope here.
// Revisit once sector_mapping ingestion exists.
export const STOCK_UNIVERSE_SUBSET = [
  "BBCA",
  "BBRI",
  "BMRI",
  "TLKM",
  "ASII",
  "UNVR",
  "ICBP",
  "ADRO",
  "ANTM",
  "PGAS",
] as const;
