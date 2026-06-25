import { describe, it, expect } from "vitest";
// Pure (Deno-free) integrity + idempotency invariants the Signal Mine relies on.
import {
  dedupeKey,
  dedupeByKey,
  isTraceable,
  roadmapKey,
  normalizeTier,
  selectTierAdapters,
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

describe("scan tier (public cost control)", () => {
  const ALL = ["reddit", "hackernews", "ai_gateway_scout", "anthropic_web_search", "perplexity_sonar", "firecrawl"];

  it("normalizeTier defaults to full, only 'lite' is lite", () => {
    expect(normalizeTier("lite")).toBe("lite");
    expect(normalizeTier("full")).toBe("full");
    expect(normalizeTier(undefined)).toBe("full");
    expect(normalizeTier("anything-else")).toBe("full");
  });

  it("full tier runs every configured adapter, holds none", () => {
    const { run, held } = selectTierAdapters(ALL, "full");
    expect(run).toEqual(ALL);
    expect(held).toEqual([]);
  });

  it("lite tier runs ONLY the cheap keyless adapters; holds the paid ones", () => {
    const { run, held } = selectTierAdapters(ALL, "lite");
    expect(run.sort()).toEqual(["ai_gateway_scout", "hackernews"]);
    // the paid web-search adapters are held back so a public scan can't run up the bill
    expect(held).toEqual(expect.arrayContaining(["firecrawl", "anthropic_web_search", "perplexity_sonar"]));
    expect(held).not.toContain("hackernews");
  });

  it("lite tier is a no-op when no cheap adapters are configured", () => {
    const { run, held } = selectTierAdapters(["firecrawl", "perplexity_sonar"], "lite");
    expect(run).toEqual([]);
    expect(held).toEqual(["firecrawl", "perplexity_sonar"]);
  });
});
