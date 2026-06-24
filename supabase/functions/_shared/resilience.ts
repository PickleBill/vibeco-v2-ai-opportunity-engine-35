// Resilience primitives shared by the LLM client: retry/backoff classification,
// timeout-aware fetch, and tolerant JSON extraction.
//
// This module is intentionally DEPENDENCY-FREE (no Deno-/Supabase-specific
// imports and no project imports) so it can be unit-tested under Vitest in Node
// as well as run inside Deno edge functions. Keep it that way.

// ─── Retry classification ───

// HTTP statuses worth retrying the SAME provider for (transient capacity/infra).
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

// Statuses where switching provider (Gateway → Anthropic-direct) may help:
// rate limit, exhausted credits, and 5xx/transient infra. 4xx like 400/401/404/
// 422 are caller/request bugs — switching provider won't fix them.
//   • 402 — generic "credits exhausted".
//   • 403 — the Lovable AI Gateway returns 403 `credit_limit_reached` when the
//           workspace hits its credit cap (a capacity/billing condition, NOT an
//           auth bug), so a different provider CAN serve the request.
const FALLBACK_STATUSES = new Set([402, 403, 408, 425, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

export function isFallbackStatus(status: number): boolean {
  return FALLBACK_STATUSES.has(status);
}

// Duck-typed: works for our LLMError (has numeric `status`), AbortError
// (timeout), and network TypeErrors (`fetch failed`) without importing them.
export function isRetryableError(err: unknown): boolean {
  const e = err as { status?: number; name?: string } | undefined;
  if (e && typeof e.status === "number") return isRetryableStatus(e.status);
  if (e && (e.name === "AbortError" || e.name === "TimeoutError")) return true; // timeout
  if (err instanceof TypeError) return true; // network/DNS/connection reset
  return false;
}

export function isFallbackEligible(err: unknown): boolean {
  const e = err as { status?: number; name?: string } | undefined;
  if (e && typeof e.status === "number") return isFallbackStatus(e.status);
  if (e && (e.name === "AbortError" || e.name === "TimeoutError")) return true;
  if (err instanceof TypeError) return true;
  return false;
}

// ─── Backoff ───

// Deterministic base used by tests; real callers add jitter on top.
export function backoffBaseMs(attempt: number, base = 500): number {
  return base * Math.pow(2, attempt); // attempt 0 → base, 1 → 2×, 2 → 4× …
}

export function backoffDelayMs(attempt: number, base = 500, jitter = true): number {
  const d = backoffBaseMs(attempt, base);
  return jitter ? d + Math.floor(Math.random() * base) : d;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface RetryOptions {
  retries: number;            // number of RETRIES (total attempts = retries + 1)
  baseDelayMs?: number;       // backoff base; pass 0 in tests for no real wait
  jitter?: boolean;
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}

/**
 * Run `fn`, retrying transient failures with exponential backoff. Non-retryable
 * errors (4xx request bugs) throw immediately. The last error is rethrown once
 * retries are exhausted.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const { retries, baseDelayMs = 500, jitter = true, onRetry } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryableError(err)) break;
      const delay = backoffDelayMs(attempt, baseDelayMs, jitter);
      onRetry?.(err, attempt, delay);
      if (delay > 0) await sleep(delay);
    }
  }
  throw lastErr;
}

// ─── Timeout-aware fetch ───

/**
 * fetch() with a hard timeout. On timeout the underlying request is aborted and
 * a TimeoutError (retryable) is thrown. Merges any caller-supplied AbortSignal.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 90_000, signal: callerSignal, ...rest } = init;
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  if (callerSignal) {
    if (callerSignal.aborted) ctl.abort();
    else callerSignal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctl.signal });
  } catch (err) {
    // Normalize abort → a named, retryable TimeoutError (unless the caller aborted).
    if ((err as Error)?.name === "AbortError" && !callerSignal?.aborted) {
      const t = new Error(`Request timed out after ${timeoutMs}ms`);
      t.name = "TimeoutError";
      throw t;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onAbort);
  }
}

// ─── Tolerant JSON extraction ───

/**
 * Extract the first balanced JSON object/array from a string that may be wrapped
 * in ```json fences or surrounded by prose. Returns null if nothing parses.
 */
export function extractJson<T = unknown>(raw: string): T | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();

  // 1) Fast path: the whole thing is JSON.
  try { return JSON.parse(trimmed) as T; } catch { /* fall through */ }

  // 2) Strip a ```json … ``` (or bare ```) fence if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()) as T; } catch { /* fall through */ }
  }

  // 3) Scan for the first balanced {...} or [...] block (string-aware).
  const block = firstBalancedBlock(trimmed);
  if (block) {
    try { return JSON.parse(block) as T; } catch { /* fall through */ }
  }
  return null;
}

function firstBalancedBlock(s: string): string | null {
  const start = s.search(/[{[]/);
  if (start === -1) return null;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Parse tool-call arguments which OpenAI-style gateways return as a JSON string
 * (but which some models wrap in prose/fences). Accepts an already-parsed object.
 * Throws a descriptive Error if nothing parses.
 */
export function parseToolArguments<T = Record<string, unknown>>(args: unknown): T {
  if (args && typeof args === "object") return args as T;
  if (typeof args === "string") {
    const parsed = extractJson<T>(args);
    if (parsed !== null) return parsed;
    throw new Error(`Tool arguments were not valid JSON: ${args.slice(0, 200)}`);
  }
  throw new Error(`Tool arguments missing or of unexpected type: ${typeof args}`);
}
