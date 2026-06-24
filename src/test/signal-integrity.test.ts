import { describe, it, expect } from "vitest";
// Pure (Deno-free) integrity + idempotency invariants the Signal Mine relies on.
import {
  dedupeKey,
  dedupeByKey,
  isTraceable,
  roadmapKey,
} from "../../supabase/functions/_shared/signal-integrity.ts";

describe("collection de-dupe (idempotency)", () => {
  it("keys on source_url, falls back to a body prefix when URL is absent", () => {
    expect(dedupeKey({ source_url: "https://x.com/a", body: "whatever" })).toBe("https://x.com/a");
    const noUrl = { body: "a".repeat(200) };
    expect(dedupeKey(noUrl)).toBe("a".repeat(80));
    expect(dedupeKey(noUrl).length).toBe(80);
  });

  it("collapses duplicate URLs, keeping first-occurrence order", () => {
    const items = [
      { source_url: "https://x.com/1", body: "first" },
      { source_url: "https://x.com/2", body: "second" },
      { source_url: "https://x.com/1", body: "dup of first, different body" },
    ];
    const out = dedupeByKey(items);
    expect(out.map((i) => i.source_url)).toEqual(["https://x.com/1", "https://x.com/2"]);
  });

  it("is idempotent — re-running over a deduped list is a no-op", () => {
    const items = [
      { source_url: "https://x.com/1", body: "a" },
      { source_url: "https://x.com/1", body: "b" },
      { source_url: "https://x.com/2", body: "c" },
    ];
    const once = dedupeByKey(items);
    const twice = dedupeByKey(once);
    expect(twice).toEqual(once);
    expect(twice.length).toBe(2);
  });

  it("dedupes URL-less rows that share an 80-char body prefix, keeps distinct ones", () => {
    const shared = "the warehouse WMS keeps double-counting inventory across every aisle and bin daily"; // >= 80 chars
    expect(shared.length).toBeGreaterThanOrEqual(80);
    const items = [
      { body: shared + " — and the night shift can't reconcile it" },
      { body: shared + " — reposting because nobody replied" },
      { body: "carrier onboarding takes three weeks of back-and-forth email threads here" },
    ];
    // First two share the identical first 80 chars → collapse to one; third is distinct.
    expect(dedupeByKey(items).length).toBe(2);
  });
});

describe("candidate traceability (truth/evidence gate)", () => {
  it("requires BOTH cluster_id and theme_id", () => {
    expect(isTraceable({ cluster_id: "c1", theme_id: "t1" })).toBe(true);
    expect(isTraceable({ cluster_id: "c1", theme_id: null })).toBe(false);
    expect(isTraceable({ cluster_id: null, theme_id: "t1" })).toBe(false);
    expect(isTraceable({})).toBe(false);
  });
});

describe("roadmap idempotency key", () => {
  it("is one current roadmap per (product_tag, scan_date)", () => {
    expect(roadmapKey("restaurant-ops", "2026-06-24")).toBe("restaurant-ops::2026-06-24");
    expect(roadmapKey("a", "2026-06-24")).not.toBe(roadmapKey("a", "2026-06-25"));
  });
});
