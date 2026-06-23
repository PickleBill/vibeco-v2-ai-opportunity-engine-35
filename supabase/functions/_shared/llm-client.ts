import { LLMError } from "./error-handler.ts";

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
}

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
  const response = await fetch(LOVABLE_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
      const fn = tc.function as { name: string; arguments: string };
      return {
        name: fn.name,
        arguments: JSON.parse(fn.arguments),
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
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
 * Call an LLM through the appropriate gateway.
 * Defaults to Lovable Gateway. Set gateway: "anthropic-direct" for direct Anthropic API.
 */
export async function callLLM(options: LLMCallOptions): Promise<LLMResponse> {
  if (options.gateway === "anthropic-direct") {
    return callAnthropicDirect(options);
  }
  return callLovableGateway(options);
}

/**
 * Call an LLM with a tool schema and return the parsed tool call arguments.
 * Throws if the LLM doesn't return a tool call.
 */
export async function callLLMWithTool<T>(options: LLMCallOptions): Promise<T> {
  const response = await callLLM(options);
  const toolCall = response.toolCalls?.[0];
  if (!toolCall) {
    throw new Error(`No tool call in LLM response for model ${options.model}`);
  }
  return toolCall.arguments as T;
}
