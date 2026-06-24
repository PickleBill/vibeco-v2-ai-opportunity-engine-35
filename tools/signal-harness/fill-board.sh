#!/usr/bin/env bash
# One-time / on-demand Signal Board fill.
#
# Drains the UNPROCESSED signal_raw rows for a product_tag through the deployed
# signal-process function (persist:true) in sequential, disjoint batches, with an
# external retry to ride out a transient gateway hiccup. Each batch processes a
# fresh set of `processed=false` rows and marks them processed, so re-running is
# safe (no duplicate candidates).
#
# Reads VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY from ./.env (the public
# client key — safe to use as the apikey; the function does the privileged work
# server-side via the service role). No secrets are printed.
#
# Requires the Lovable AI Gateway workspace to have credits (or ANTHROPIC_API_KEY
# set on a deployed build with provider fallback). If the gateway is credit-capped
# you'll see "AI credits exhausted" and the board is left untouched.
#
# Usage:  tools/signal-harness/fill-board.sh <product_tag> [vertical_label] [batch_size]
# Example: tools/signal-harness/fill-board.sh wholesale-distribution-3pl "Wholesale distribution / 3PL" 100
set -u
HERE="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$HERE"
set -a; . ./.env 2>/dev/null; set +a
URL="${VITE_SUPABASE_URL:?set VITE_SUPABASE_URL in .env}"
KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:?set VITE_SUPABASE_PUBLISHABLE_KEY in .env}"
TAG="${1:?usage: fill-board.sh <product_tag> [vertical] [batch_size]}"
VERTICAL="${2:-$TAG}"
BATCH="${3:-100}"

cnt() { curl -s -D - -o /dev/null --max-time 25 -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: count=exact" \
  "$URL/rest/v1/$1?select=id&limit=1&$2" | tr -d '\r' | grep -i '^content-range:' | sed -E 's#.*/##'; }

echo "BEFORE  unprocessed=$(cnt signal_raw "product_tag=eq.$TAG&processed=eq.false") candidates=$(cnt feature_candidates "product_tag=eq.$TAG")"

consec_fail=0
for batch in $(seq 1 20); do
  ok=0
  for mode in deep deep fast; do
    RESP=$(curl -s --max-time 280 -X POST -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
      "$URL/functions/v1/signal-process" \
      -d "{\"product\":\"$TAG\",\"product_context\":\"$VERTICAL\",\"persist\":true,\"limit\":$BATCH,\"mode\":\"$mode\"}")
    COLLECTED=$(echo "$RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['counts']['collected'] if d.get('counts') else 'ERR')" 2>/dev/null || echo PARSE)
    if [ "$COLLECTED" != ERR ] && [ "$COLLECTED" != PARSE ]; then
      CANDS=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin)['counts']['candidates'])" 2>/dev/null)
      echo "batch $batch [$mode]: collected=$COLLECTED new_candidates=$CANDS"
      ok=1; break
    fi
    echo "batch $batch [$mode]: FAIL $(echo "$RESP" | head -c 90)"
  done
  [ "$ok" = 0 ] && { consec_fail=$((consec_fail+1)); [ "$consec_fail" -ge 2 ] && { echo "ABORT: gateway degraded/credit-capped"; break; }; continue; }
  consec_fail=0
  [ "$COLLECTED" = 0 ] && { echo "DRAINED"; break; }
done

echo "AFTER   processed=$(cnt signal_raw "product_tag=eq.$TAG&processed=eq.true") unprocessed=$(cnt signal_raw "product_tag=eq.$TAG&processed=eq.false") candidates=$(cnt feature_candidates "product_tag=eq.$TAG") clusters=$(cnt signal_clusters "product_tag=eq.$TAG") themes=$(cnt signal_themes "product_tag=eq.$TAG")"
