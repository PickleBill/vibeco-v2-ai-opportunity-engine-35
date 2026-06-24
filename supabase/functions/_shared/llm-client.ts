import { LLMError } from "./error-handler.ts";
import { anthropicDirectFallbackModel } from "./model-router.ts";
import {
  extractJson,
  fetchWithTimeout,
  isFallbackEligible,
  parseToolArguments,
  withRetry,
} from "./resilience.ts";

// ─── Types ───

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMToolChoice {
  type: "function";
  function: { name: string };
}

export interface LLMCallOptions {
  model: string;
  messages: LLMMessage[];
  tools?: LLMToolDef[];
  toolChoice?: LLMToolChoice;
  responseFormat?: { type: string };
  maxTokens?: number;
  modalities?: string[];
  gateway?: "lovable" | "anthropic-direct";
  /** Per-request hard timeout (ms). Default 90s. The request is aborted + retried on timeout. */
  timeoutMs?: number;
  /** Number of retries on transient failures (429/5xx/timeout/network). Default 2 (→ 3 attempts). */
  maxRetries?: number;
  /** Disable the Gateway→Anthropic-direct provider fallback for this call. Default false. */
  disableFallback?: boolean;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_RETRIES = 2;

const getAnthropicKey = () =>
  Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("anthropic_api_key") || "";

export interface LLMToolCallResult {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content?: string;
  toolCalls?: LLMToolCallResult[];
  images?: { url: string }[];
  latencyMs: number;
}

// ─── Gateway Calls ───

const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callLovableGateway(options: LLMCallOptions): Promise<LLMResponse> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
  };

  if (options.tools) body.tools = options.tools;
  if (options.toolChoice) body.tool_choice = options.toolChoice;
  if (options.responseFormat) body.response_format = options.responseFormat;
  if (options.maxTokens) body.max_tokens = options.maxTokens;
  if (options.modalities) body.modalities = options.modalities;

  const start = Date.now();
  const response = await fetchWithTimeout(LOVABLE_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const text = await response.text();
    console.error(`LLM gateway error [${options.model}]:`, response.status, text);
    throw new LLMError(response.status, text);
  }

  const data = await response.json();
  return parseLovableResponse(data, latencyMs);
}

function parseLovableResponse(data: Record<string, unknown>, latencyMs: number): LLMResponse {
  const choice = (data.choices as Record<string, unknown>[])?.[0];
  const message = choice?.message as Record<string, unknown> | undefined;

  const result: LLMResponse = { latencyMs };

  // Text content
  if (message?.content) {
    result.content = message.content as string;
  }

  // Tool calls
  const toolCalls = message?.tool_calls as Record<string, unknown>[] | undefined;
  if (toolCalls?.length) {
    result.toolCalls = toolCalls.map((tc) => {
      const fn = tc.function as { name: string; arguments: unknown };
      return {
        name: fn.name,
        // Tolerant parse: gateways send a JSON string, but some models wrap it
        // in prose/fences — recover the JSON instead of throwing a SyntaxError.
        arguments: parseToolArguments(fn.arguments),
      };
    });
  }

  // Images (Gemini image generation)
  const images = message?.images as Record<string, unknown>[] | undefined;
  if (images?.length) {
    result.images = images.map((img) => ({
      url: (img.image_url as Record<string, string>)?.url || "",
    }));
  }

  return result;
}

// ─── Anthropic Direct (fallback) ───

async function callAnthropicDirect(options: LLMCallOptions): Promise<LLMResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  // Convert OpenAI-style messages to Anthropic format
  const systemMessage = options.messages.find((m) => m.role === "system");
  const userMessages = options.messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model: options.model.replace("anthropic/", ""),
    max_tokens: options.maxTokens || 4096,
    messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
  };

  if (systemMessage) body.system = systemMessage.content;

  // Convert OpenAI tools to Anthropic format
  if (options.tools) {
    body.tools = options.tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }
  if (options.toolChoice) {
    body.tool_choice = { type: "tool", name: options.toolChoice.function.name };
  }

  const start = Date.now();
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const text = await response.text();
    console.error(`Anthropic direct error:`, response.status, text);
    throw new LLMError(response.status, text);
  }

  const data = await response.json();
  return parseAnthropicResponse(data, latencyMs);
}

function parseAnthropicResponse(data: Record<string, unknown>, latencyMs: number): LLMResponse {
  const result: LLMResponse = { latencyMs };
  const content = data.content as Record<string, unknown>[];

  for (const block of content || []) {
    if (block.type === "text") {
      result.content = block.text as string;
    }
    if (block.type === "tool_use") {
      if (!result.toolCalls) result.toolCalls = [];
      result.toolCalls.push({
        name: block.name as string,
        arguments: block.input as Record<string, unknown>,
      });
    }
  }

  return result;
}

// ─── Public API ───

/**
 * Call an LLM through the appropriate gateway, with timeout, retry-with-backoff,
 * and provider fallback.
 *
 * - Defaults to the Lovable Gateway; set `gateway: "anthropic-direct"` to force Anthropic.
 * - Transient failures (429 / 5xx / timeout / network) are retried with exponential backoff.
 * - If the Gateway stays unhealthy (429 / 402 credits / 5xx / timeout) AND
 *   ANTHROPIC_API_KEY is set, the call fails over to the Anthropic API directly
 *   (model from model-router, unless the requested model is already an Anthropic one).
 *   Set `disableFallback: true` to opt out.
 */
export async function callLLM(options: LLMCallOptions): Promise<LLMResponse> {
  const retries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  if (options.gateway === "anthropic-direct") {
    return withRetry(() => callAnthropicDirect(options), {
      retries,
      onRetry: (err, attempt) =>
        console.warn(`[llm-client] anthropic-direct retry ${attempt + 1}:`, describeErr(err)),
    });
  }

  try {
    return await withRetry(() => callLovableGateway(options), {
      retries,
      onRetry: (err, attempt) =>
        console.warn(`[llm-client] gateway retry ${attempt + 1} [${options.model}]:`, describeErr(err)),
    });
  } catch (err) {
    // Provider fallback: the Gateway is down/over-capacity — try Anthropic directly.
    if (!options.disableFallback && isFallbackEligible(err) && getAnthropicKey()) {
      const model = options.model.startsWith("anthropic/")
        ? options.model
        : anthropicDirectFallbackModel();
      console.warn(
        `[llm-client] gateway failed (${describeErr(err)}); failing over to anthropic-direct (${model}).`,
      );
      try {
        return await withRetry(
          () => callAnthropicDirect({ ...options, model, gateway: "anthropic-direct" }),
          { retries },
        );
      } catch (fbErr) {
        console.error("[llm-client] anthropic-direct fallback also failed:", describeErr(fbErr));
        throw err; // surface the ORIGINAL gateway error (more meaningful to the caller)
      }
    }
    throw err;
  }
}

function describeErr(err: unknown): string {
  if (err instanceof LLMError) return `LLMError ${err.status}`;
  const e = err as { name?: string; message?: string };
  return e?.name ? `${e.name}: ${e.message ?? ""}` : String(err);
}

/**
 * Call an LLM with a tool schema and return the parsed tool call arguments.
 * Falls back to extracting JSON from the message content if the model answered
 * with content instead of a tool call. Throws if neither yields usable JSON.
 */
export async function callLLMWithTool<T>(options: LLMCallOptions): Promise<T> {
  const response = await callLLM(options);
  const toolCall = response.toolCalls?.[0];
  if (toolCall) return toolCall.arguments as T;

  // Some models (or the anthropic-direct fallback) answer in content — recover it.
  if (response.content) {
    const parsed = extractJson<T>(response.content);
    if (parsed !== null) return parsed;
  }
  throw new Error(`No tool call in LLM response for model ${options.model}`);
}
