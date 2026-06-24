#!/usr/bin/env node
// QA Scorecard — the automated cross-system gate for the AI Opportunity Engine.
//
// Runs the four data-truth gates against the LIVE database (public-read REST, no
// secrets) + a fake-stat audit over the frontend, and prints PASS/FAIL. Reusable:
// `node AI-OPPORTUNITY-ENGINE/qa-scorecard.mjs`. Exit code 0 = all gates pass.
//
// Gates:
//   TRUTH    — zero synthetic source rows; every candidate traceable (cluster+theme)
//   EVIDENCE — every roadmap vertical resolves to real signal_raw.source_url rows
//   BREADTH  — >= 3 verticals with a roadmap (warm-start floor)
//   SOURCE   — honest source health (real URLs, synth fraction reported)
//   FAKE-STAT— no obvious hardcoded stats in the Home/Signal frontend (heuristic)

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const SUPA = process.env.VITE_SUPABASE_URL || "https://brpqtaaknxdqkjvzfvlo.supabase.co";
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_CPiVPJHnvgSMhvhVP1v6Sw_XpAgItPD";

async function rest(path) {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`REST ${path} → ${res.status}`);
  return res.json();
}
async function count(table, qs = "") {
  const res = await fetch(`${SUPA}/rest/v1/${table}?select=id${qs ? "&" + qs : ""}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact", Range: "0-0" },
  });
  const cr = res.headers.get("content-range") || "*/0";
  return Number(cr.split("/")[1] || 0);
}

const results = [];
const pass = (name, ok, detail) => { results.push({ name, ok, detail }); };

async function dataGates() {
  const roadmaps = await rest("opportunity_roadmaps?select=product_tag,opportunities");
  const tags = [...new Set(roadmaps.map((r) => r.product_tag))];

  // BREADTH
  pass("BREADTH ≥3 verticals w/ roadmap", tags.length >= 3, `${tags.length} verticals: ${tags.join(", ")}`);

  // TRUTH — synth rows
  const totalRaw = await count("signal_raw");
  const synthRaw = await count("signal_raw", "source_url=like.synth://*");
  pass("TRUTH zero synthetic sources", synthRaw === 0, `${synthRaw}/${totalRaw} raw rows are synth://`);

  // TRUTH — traceability
  const totalCand = await count("feature_candidates");
  const untraceable = await count("feature_candidates", "or=(cluster_id.is.null,theme_id.is.null)");
  pass("TRUTH candidates traceable", untraceable === 0, `${untraceable}/${totalCand} candidates missing cluster_id/theme_id`);

  // EVIDENCE — each roadmap vertical has real source URLs
  let evidenceOk = true; const evDetail = [];
  for (const tag of tags) {
    const real = await count("signal_raw", `product_tag=eq.${encodeURIComponent(tag)}&source_url=not.like.synth://*`);
    if (real < 1) evidenceOk = false;
    evDetail.push(`${tag}:${real}`);
  }
  pass("EVIDENCE real source rows / vertical", evidenceOk, evDetail.join("  "));

  // SOURCE health — report sources in play
  const srcRows = await rest("signal_raw?select=source&limit=2000");
  const bySource = {};
  for (const r of srcRows) bySource[r.source] = (bySource[r.source] || 0) + 1;
  pass("SOURCE health (informational)", true, Object.entries(bySource).map(([s, n]) => `${s}:${n}`).join("  "));

  // Opportunity count (informational)
  const opps = roadmaps.reduce((a, r) => a + (Array.isArray(r.opportunities) ? r.opportunities.length : 0), 0);
  pass("GALLERY opportunities (informational)", opps > 0, `${opps} opportunities across ${tags.length} verticals`);
}

function fakeStatAudit() {
  // Heuristic: flag numeric literals that look like STATS in the surfaces the
  // truth rule covers. Marketing prose numbers are noise; we look for the known
  // offenders + suspicious patterns and report for manual review (soft gate).
  const files = [
    "src/pages/Index.tsx",
    "src/pages/SignalBoard.tsx",
    "src/components/StatsBar.tsx",
    "src/components/Hero.tsx",
    "src/components/SocialProof.tsx",
  ].filter(existsSync);
  const suspicious = [];
  const patterns = [
    /\b\d{1,3},\d{3}\b/,            // 1,154 style counts
    /\b\d+\s*\+\s*(workflows|proofs|projects|sources|signals|founders|companies)/i,
    /\b24\/7\b/,
    /\b\d{2,3}\s*%/,               // hardcoded percentages
    /<\s*\d{3,}\s*hrs?/i,
  ];
  for (const f of files) {
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((ln, i) => {
      if (ln.trim().startsWith("//") || ln.trim().startsWith("*")) return;
      for (const p of patterns) if (p.test(ln)) { suspicious.push(`${f}:${i + 1}  ${ln.trim().slice(0, 90)}`); break; }
    });
  }
  pass("FAKE-STAT audit (soft)", suspicious.length === 0,
    suspicious.length ? `${suspicious.length} literal(s) to verify:\n    ` + suspicious.join("\n    ") : "no hardcoded stat literals found in Home/Signal");
}

function buildGate() {
  try {
    execSync("npx vitest run", { cwd: process.cwd(), stdio: "pipe" });
    pass("BUILD tests green", true, "vitest run passed");
  } catch (e) {
    const out = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
    const m = out.match(/Tests\s+.*\((\d+)\)/);
    pass("BUILD tests green", false, m ? m[0] : "vitest run failed");
  }
}

const args = process.argv.slice(2);
console.log("\n=== AI Opportunity Engine — QA Scorecard ===\n");
try {
  await dataGates();
} catch (e) {
  pass("DATA gates", false, `could not reach DB: ${e.message}`);
}
fakeStatAudit();
if (args.includes("--build")) buildGate();

let allHard = true;
for (const r of results) {
  const soft = r.name.includes("informational") || r.name.includes("(soft)");
  const icon = r.ok ? "✅ PASS" : (soft ? "⚠️  WARN" : "❌ FAIL");
  if (!r.ok && !soft) allHard = false;
  console.log(`${icon}  ${r.name}`);
  if (r.detail) console.log(`        ${r.detail}`);
}
console.log(`\n=== ${allHard ? "ALL HARD GATES PASS" : "GATE FAILURE — see ❌ above"} ===\n`);
process.exit(allHard ? 0 : 1);
