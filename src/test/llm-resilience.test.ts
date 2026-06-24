import { describe, it, expect } from "vitest";
// Pure (Deno-free) resilience helpers shared by the edge LLM client.
import {
  backoffBaseMs,
  extractJson,
  isFallbackStatus,
  isRetryableError,
  isRetryableStatus,
  parseToolArguments,
  withRetry,
} from "../../supabase/functions/_shared/resilience.ts";

describe("retry classification", () => {
  it("treats capacity/infra statuses as retryable", () => {
    for (const s of [408, 429, 500, 502, 503, 504]) expect(isRetryableStatus(s)).toBe(true);
    for (const s of [400, 401, 402, 404, 422]) expect(isRetryableStatus(s)).toBe(false);
  });

  it("treats 402/403 credit limits + 429 + 5xx as fallback-eligible, but not request bugs", () => {
    for (const s of [402, 403, 429, 503]) expect(isFallbackStatus(s)).toBe(true);
    for (const s of [400, 401, 404, 422]) expect(isFallbackStatus(s)).toBe(false);
  });

  it("does NOT retry a 403 against the same (credit-limited) gateway", () => {
    // 403 credit_limit_reached → fail over to another provider, never retry-in-place.
    expect(isRetryableStatus(403)).toBe(false);
    expect(isFallbackStatus(403)).toBe(true);
  });

  it("classifies errors by shape (status / timeout / network)", () => {
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ name: "TimeoutError" })).toBe(true);
    expect(isRetryableError(new TypeError("fetch failed"))).toBe(true);
    expect(isRetryableError(new Error("nope"))).toBe(false);
  });
});

describe("backoff", () => {
  it("grows exponentially from the base", () => {
    expect(backoffBaseMs(0, 500)).toBe(500);
    expect(backoffBaseMs(1, 500)).toBe(1000);
    expect(backoffBaseMs(2, 500)).toBe(2000);
  });
});

describe("withRetry", () => {
  it("retries transient failures then succeeds", async () => {
    let calls = 0;
    const out = await withRetry(async () => {
      calls++;
      if (calls < 3) throw { status: 503 };
      return "ok";
    }, { retries: 3, baseDelayMs: 0 });
    expect(out).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry non-retryable errors", async () => {
    let calls = 0;
    await expect(withRetry(async () => {
      calls++;
      throw { status: 400 };
    }, { retries: 3, baseDelayMs: 0 })).rejects.toMatchObject({ status: 400 });
    expect(calls).toBe(1);
  });

  it("rethrows the last error after exhausting retries", async () => {
    let calls = 0;
    await expect(withRetry(async () => {
      calls++;
      throw { status: 500 };
    }, { retries: 2, baseDelayMs: 0 })).rejects.toMatchObject({ status: 500 });
    expect(calls).toBe(3); // 1 try + 2 retries
  });
});

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("parses ```json fenced JSON", () => {
    expect(extractJson('```json\n{"a":1,"b":[2,3]}\n```')).toEqual({ a: 1, b: [2, 3] });
  });
  it("recovers JSON embedded in prose", () => {
    expect(extractJson('Sure! Here it is: {"ok":true} — hope that helps')).toEqual({ ok: true });
  });
  it("handles arrays and nested braces with strings", () => {
    expect(extractJson('prefix [{"x":"a}b"},{"y":1}] suffix')).toEqual([{ x: "a}b" }, { y: 1 }]);
  });
  it("returns null when nothing parses", () => {
    expect(extractJson("no json here")).toBeNull();
  });
});

describe("parseToolArguments", () => {
  it("passes through an already-parsed object", () => {
    expect(parseToolArguments({ a: 1 })).toEqual({ a: 1 });
  });
  it("parses a JSON string", () => {
    expect(parseToolArguments('{"a":1}')).toEqual({ a: 1 });
  });
  it("recovers fenced JSON in a string", () => {
    expect(parseToolArguments('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("throws on unparseable input", () => {
    expect(() => parseToolArguments("totally not json")).toThrow();
  });
});
