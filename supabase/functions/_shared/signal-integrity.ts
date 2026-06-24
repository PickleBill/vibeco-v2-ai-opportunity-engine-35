// Pure, Deno-free integrity + idempotency helpers for the Signal Mine pipeline.
//
// These encode the invariants the pipeline relies on so they can be imported by
// BOTH the edge functions (real code path) and the vitest suite (so the
// invariants are actually tested, not just asserted in prose). No Deno or
// Supabase imports here — keep it pure.

export interface DedupeItem {
  source_url?: string;
  body: string;
}

/**
 * The within-run de-dupe key. Mirrors the DB-side
 * `upsert(..., { onConflict: "source_url" })`: a real URL is the identity. When
 * an item has no URL (degraded/synth rows), fall back to a body prefix so we
 * still collapse obvious duplicates within a single run.
 */
export function dedupeKey(it: DedupeItem): string {
  return it.source_url || it.body.slice(0, 80);
}

/**
 * Idempotent within-run de-dupe, stable on first-occurrence order. Re-running it
 * over an already-deduped list returns the same list (idempotent). Combined with
 * the DB upsert(onConflict:"source_url"), cross-run collection is idempotent too:
 * a mid-run kill + restart never double-writes the same URL.
 */
export function dedupeByKey<T extends DedupeItem>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const k = dedupeKey(it);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface TraceableCandidate {
  cluster_id?: string | null;
  theme_id?: string | null;
}

/**
 * A feature candidate is traceable iff it links back to real evidence: it must
 * carry BOTH a `cluster_id` (→ `signal_raw.cluster_id` for per-quote source URLs)
 * and a `theme_id` (→ the durable trend-tracked theme). The Evidence drawer's
 * candidate→source join assumes this; the truth gate enforces it.
 */
export function isTraceable(c: TraceableCandidate): boolean {
  return !!c.cluster_id && !!c.theme_id;
}

/**
 * The idempotency key for a persisted roadmap: exactly one current roadmap per
 * (product_tag, scan_date). Mirrors opportunity-roadmap's delete-then-insert so
 * re-drafting a vertical the same day replaces rather than duplicates.
 */
export function roadmapKey(product_tag: string, scan_date: string): string {
  return `${product_tag}::${scan_date}`;
}
