import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Memory tools — shared organizational memory across Claude Code sessions.
 *
 * When Session A makes an architectural decision, it writes it here.
 * Session B can query decisions and learn from them.
 * This is how the AI ecosystem compounds knowledge instead of starting from zero.
 *
 * Two modes:
 *   - Filter-based: get_decisions(project, category) — exact match
 *   - Semantic: search_decisions(query) — similarity over embeddings
 */

export interface Decision {
  session_id?: string;
  project?: string;
  category?: string;
  title: string;
  content: string;
}

// ─── Embedding Generation (OpenAI text-embedding-3-small) ───

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null; // gracefully skip if no key

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // stay under token limit
      }),
    });
    if (!response.ok) {
      console.error(`Embedding API error ${response.status}: ${await response.text()}`);
      return null;
    }
    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (e) {
    console.error("Embedding generation failed:", (e as Error).message);
    return null;
  }
}

// ─── Write ───

export async function saveDecision(supabase: SupabaseClient, decision: Decision) {
  // Generate embedding from title + content for semantic search
  const textToEmbed = `${decision.title}\n\n${decision.content}`;
  const embedding = await generateEmbedding(textToEmbed);

  const insertPayload: Record<string, unknown> = {
    session_id: decision.session_id || "unknown",
    project: decision.project || "general",
    category: decision.category || "insight",
    title: decision.title,
    content: decision.content,
  };

  if (embedding) {
    insertPayload.embedding = embedding;
  }

  const { data, error } = await supabase
    .from("org_decisions")
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw new Error(`Failed to save decision: ${error.message}`);
  return {
    ...data,
    embedded: !!embedding,
    note: embedding ? undefined : "Saved without embedding — set OPENAI_API_KEY for semantic search",
  };
}

// ─── Filter-Based Read (existing) ───

export async function getDecisions(
  supabase: SupabaseClient,
  filters?: { project?: string; category?: string; limit?: number },
) {
  let query = supabase
    .from("org_decisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit || 20);

  if (filters?.project) query = query.eq("project", filters.project);
  if (filters?.category) query = query.eq("category", filters.category);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch decisions: ${error.message}`);
  return data || [];
}

// ─── Semantic Search (NEW) ───

export async function searchDecisions(
  supabase: SupabaseClient,
  query: string,
  options?: { limit?: number; project?: string; category?: string },
) {
  const embedding = await generateEmbedding(query);
  if (!embedding) {
    return {
      error: "Semantic search requires OPENAI_API_KEY. Falling back to filter-based search.",
      results: await getDecisions(supabase, {
        project: options?.project,
        category: options?.category,
        limit: options?.limit || 10,
      }),
      fallback: true,
    };
  }

  const { data, error } = await supabase.rpc("match_decisions", {
    query_embedding: embedding,
    match_count: options?.limit || 10,
    filter_project: options?.project || null,
    filter_category: options?.category || null,
  });

  if (error) throw new Error(`Semantic search failed: ${error.message}`);

  return {
    query,
    results: data || [],
    count: (data || []).length,
    method: "semantic-cosine-similarity",
  };
}
