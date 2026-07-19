// v2-placeholder endpoints. Per docs/api-contract.md and the Fase 4 task
// constraint: MUST return exactly { status: "coming_soon" }, no other
// fields, regardless of query params. Do not implement real logic here
// even where technically possible (e.g. GOAPI broker-per-saham data,
// see docs/konsep-arsitektur-bandarmology-idx.md section 2) - that is an
// explicit product decision already made by Kris, not a gap to fill.

import { jsonResponse } from "../http.ts";

export function handleComingSoon(): Response {
  return jsonResponse({ status: "coming_soon" });
}
