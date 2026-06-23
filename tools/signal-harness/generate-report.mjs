#!/usr/bin/env node
/**
 * Signal Mine testing harness — report generator.
 *
 * Turns a scan result (JSON) into a self-contained, non-technical HTML report:
 * "here's what we ran, here's what it found, here's the suggested roadmap."
 *
 * Usage:
 *   node tools/signal-harness/generate-report.mjs \
 *     --in tools/signal-harness/fixtures/niceace-scan.json \
 *     --out aces/preview/signal-sample-report.html
 *
 * The JSON shape matches what `signal-process` returns (plus a `meta` block and
 * optional `raw_samples` / `classification_breakdown` for the report). So the
 * SAME generator works on a live scan: pipe the function's JSON in, get a
 * shareable report out. No dependencies.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);
const inPath = args.in || "tools/signal-harness/fixtures/niceace-scan.json";
const outPath = args.out || "aces/preview/signal-sample-report.html";

const data = JSON.parse(readFileSync(inPath, "utf8"));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ── trend + roadmap derivation ──────────────────────────────────────────────
const trendOf = (h) => (h && h.length >= 2 ? Math.round(h[h.length - 1].s - h[h.length - 2].s) : 0);
const priority = (c) => Math.round((c.pain_score * c.confidence) / 100);
const bucketOf = (c) => {
  const p = priority(c);
  if (p >= 60 && c.effort !== "L") return "Now";
  if (p >= 45) return "Next";
  return "Later";
};

function sparkline(history) {
  const pts = (history || []).map((p) => p.s);
  if (pts.length < 2) return "";
  const w = 80, h = 24, min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
  const d = pts.map((p, i) => `${((i / (pts.length - 1)) * w).toFixed(1)},${(h - ((p - min) / span) * h).toFixed(1)}`).join(" ");
  const up = pts[pts.length - 1] >= pts[0];
  return `<svg width="${w}" height="${h}" style="overflow:visible"><polyline points="${d}" fill="none" stroke="${up ? "#ff6b5e" : "#36e0a6"}" stroke-width="2"/></svg>`;
}

const painColor = (s) => (s >= 75 ? "#ff6b5e" : s >= 55 ? "#f5c451" : "#9a97a6");
const trendBadge = (t) => t > 1 ? `<span style="color:#ff6b5e">▲ +${t}</span>` : t < -1 ? `<span style="color:#36e0a6">▼ ${t}</span>` : `<span style="color:#9a97a6">→ ${t}</span>`;

const m = data.meta || {};
const counts = data.counts || {};
const candidates = [...(data.candidates || [])].sort((a, b) => priority(b) - priority(a));
const buckets = { Now: [], Next: [], Later: [] };
candidates.forEach((c) => buckets[bucketOf(c)].push(c));

// ── render ──────────────────────────────────────────────────────────────────
const classRows = (data.classification_breakdown || []).map((r) => {
  const total = (data.classification_breakdown || []).reduce((s, x) => s + x.n, 0) || 1;
  const pct = Math.round((r.n / total) * 100);
  const keep = r.label === "pain_point" || r.label === "feature_request";
  return `<div class="cls"><span class="cls-l">${esc(r.label)}</span>
    <span class="cls-bar"><span style="width:${pct}%;background:${keep ? "#c6ff3a" : "#2f2c39"}"></span></span>
    <span class="cls-n">${r.n}</span></div>`;
}).join("");

const rawRows = (data.raw_samples || []).map((r) => `
  <tr>
    <td><span class="src src-${esc(r.source)}">${esc(r.source === "reddit" ? "Reddit" : "App review")}</span></td>
    <td><b>${esc(r.title)}</b><div class="snip">${esc(r.snippet)}</div></td>
    <td><span class="lbl lbl-${esc(r.label)}">${esc(r.label)}</span><div class="conf">${Math.round((r.confidence || 0) * 100)}%</div></td>
  </tr>`).join("");

const themeCards = (data.themes || []).map((t) => {
  const tr = trendOf(t.score_history);
  return `<div class="card theme">
    <div class="theme-top"><span class="theme-title">${esc(t.title)}</span>${sparkline(t.score_history)}</div>
    <div class="theme-meta">
      <span class="pain" style="color:${painColor(t.pain_score)}">${Math.round(t.pain_score)}</span>
      ${trendBadge(tr)}
      <span class="seen">seen ${t.occurrence_count}×</span>
    </div>
  </div>`;
}).join("");

const candCard = (c) => `<div class="card cand">
  <div class="cand-top">
    <span class="pain" style="color:${painColor(c.pain_score)}">${Math.round(c.pain_score)}</span>
    <span class="cand-title">${esc(c.cluster_theme)}</span>
    <span class="tags"><span class="tag">${c.confidence}% conf</span><span class="tag">effort ${esc(c.effort)}</span><span class="tag">${c.evidence?.member_count ?? 0} signals</span><span class="tag prio">P${priority(c)}</span></span>
  </div>
  <div class="grid2">
    <div><div class="k">Problem</div><p>${esc(c.problem)}</p></div>
    <div><div class="k accent">Proposed feature</div><p>${esc(c.proposed_solution)}</p></div>
  </div>
  <div class="quotes">${(c.representative_quotes || []).map((q) => `<div class="q">“${esc(q)}”</div>`).join("")}
    <div class="sources">sources: ${esc((c.evidence?.sources || []).join(" · "))}</div></div>
</div>`;

const roadmapCol = (name, list, hint) => `<div class="rm-col">
  <div class="rm-head">${name} <span>${hint}</span></div>
  ${list.length ? list.map((c) => `<div class="rm-item"><span class="pain" style="color:${painColor(c.pain_score)}">${Math.round(c.pain_score)}</span> ${esc(c.cluster_theme)} <span class="rm-eff">${esc(c.effort)}</span></div>`).join("") : `<div class="rm-empty">—</div>`}
</div>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(m.product || "Signal Mine")} — Scan Report</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Albert+Sans:wght@400;500;600;700&family=Archivo:wght@700;800;900&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box} body{margin:0;background:radial-gradient(1000px 600px at 50% -10%,#1a1622,#0b0a0f 60%);color:#fff;font-family:'Albert Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:960px;margin:0 auto;padding:40px 20px 80px}
.eyebrow{display:flex;align-items:center;gap:8px;color:#c6ff3a;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
h1{font-family:'Archivo';font-weight:900;font-size:34px;margin:8px 0 2px}
.sub{color:#9a97a6;font-size:14px}
.banner{margin:16px 0 0;padding:10px 14px;border:1px solid #2f2c39;border-radius:12px;background:#16141d;color:#cdbf9a;font-size:13px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}
.stat{border:1px solid #262b28;border-radius:14px;background:#121514;padding:14px}
.stat b{font-family:'Archivo';font-weight:900;font-size:26px;display:block;line-height:1}
.stat span{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#9a97a6;margin-top:6px;display:block}
h2{font-family:'Sora';font-weight:700;font-size:18px;margin:34px 0 12px}
.section-hint{color:#9a97a6;font-size:13px;font-weight:400;margin-left:8px}
.card{border:1px solid #262b28;border-radius:16px;background:#121514;padding:16px;margin-bottom:12px}
.cls{display:flex;align-items:center;gap:10px;margin:6px 0;font-size:13px}
.cls-l{width:120px;color:#cdcdd6}.cls-bar{flex:1;height:8px;background:#0e0d14;border-radius:5px;overflow:hidden}.cls-bar span{display:block;height:100%}.cls-n{width:30px;text-align:right;color:#9a97a6}
table{width:100%;border-collapse:collapse}
td{border-top:1px solid #21261f;padding:10px 8px;vertical-align:top;font-size:13px}
.snip{color:#9a97a6;font-size:12px;margin-top:3px}
.src{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap}.src-reddit{background:rgba(255,107,94,.14);color:#ff8a3c}.src-appstore_review{background:rgba(54,224,166,.14);color:#36e0a6}
.lbl{font-size:11px;font-weight:600;color:#cdcdd6}.conf{color:#9a97a6;font-size:11px}
.grid-themes{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.theme-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.theme-title{font-weight:600;font-size:14px}
.theme-meta{display:flex;align-items:center;gap:12px;margin-top:8px;font-size:12px;font-weight:700}
.pain{font-family:'Archivo';font-weight:900;font-size:18px}.seen{margin-left:auto;color:#9a97a6;font-weight:400}
.cand-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.cand-title{font-family:'Sora';font-weight:700;font-size:16px}
.tags{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}.tag{font-size:11px;border:1px solid #2f2c39;border-radius:20px;padding:2px 8px;color:#cdcdd6}.tag.prio{background:#c6ff3a;color:#1a1310;border:0;font-weight:700}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}.k{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#9a97a6}.k.accent{color:#c6ff3a}.grid2 p{font-size:13px;margin:5px 0 0;line-height:1.45}
.quotes{margin-top:12px;border:1px solid #21261f;background:#0e0d14;border-radius:10px;padding:10px}.q{font-size:12px;color:#bdbdc8;font-style:italic;margin:3px 0}.sources{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#6f6c7b;margin-top:6px}
.roadmap{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.rm-col{border:1px solid #262b28;border-radius:14px;background:#121514;padding:12px;min-height:90px}
.rm-head{font-family:'Sora';font-weight:700;font-size:14px;margin-bottom:8px}.rm-head span{color:#9a97a6;font-weight:400;font-size:11px;display:block}
.rm-item{display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 0;border-top:1px solid #21261f}.rm-eff{margin-left:auto;color:#9a97a6}.rm-empty{color:#6f6c7b}
.foot{margin-top:40px;color:#6f6c7b;font-size:12px;text-align:center}
@media(max-width:640px){.stats{grid-template-columns:repeat(2,1fr)}.grid2,.grid-themes,.roadmap{grid-template-columns:1fr}}
</style></head><body><div class="wrap">

<div class="eyebrow">◎ Signal Mine · scan report</div>
<h1>${esc(m.product || "Product")} — what the market is saying</h1>
<div class="sub">${esc(m.run_label || "")} · scanned ${esc((m.scanned_at || "").slice(0,10))} · sources: ${esc((m.sources || []).join(" · "))}</div>
${m.note ? `<div class="banner">ℹ️ ${esc(m.note)}</div>` : ""}

<div class="stats">
  <div class="stat"><b>${counts.collected ?? "—"}</b><span>Items collected</span></div>
  <div class="stat"><b>${counts.pain ?? "—"}</b><span>Pain / requests</span></div>
  <div class="stat"><b>${counts.clusters ?? "—"}</b><span>Themes</span></div>
  <div class="stat"><b>${counts.candidates ?? "—"}</b><span>Candidates</span></div>
</div>

<h2>1 · What we ran <span class="section-hint">classification of everything collected</span></h2>
<div class="card">${classRows}</div>

<h2>2 · Raw signal <span class="section-hint">a sample of the actual posts/reviews</span></h2>
<div class="card" style="padding:4px 12px"><table>${rawRows}</table></div>

<h2>3 · Themes &amp; trends <span class="section-hint">durable across scans (Pulse P1)</span></h2>
<div class="grid-themes">${themeCards}</div>

<h2>4 · Feature candidates <span class="section-hint">ranked by pain × confidence</span></h2>
${candidates.map(candCard).join("")}

<h2>5 · Suggested roadmap <span class="section-hint">auto-bucketed; a CPO confirms</span></h2>
<div class="roadmap">
  ${roadmapCol("Now", buckets.Now, "high priority · low/med effort")}
  ${roadmapCol("Next", buckets.Next, "solid signal")}
  ${roadmapCol("Later", buckets.Later, "watch / high effort")}
</div>

<div class="foot">Generated by the Signal Mine harness · tools/signal-harness/generate-report.mjs · ${esc(m.product || "")}</div>
</div></body></html>`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.log(`✓ report written: ${outPath} (${(html.length / 1024).toFixed(1)} kB)`);
console.log(`  ${counts.candidates ?? 0} candidates · ${counts.clusters ?? 0} themes · Now/Next/Later = ${buckets.Now.length}/${buckets.Next.length}/${buckets.Later.length}`);
