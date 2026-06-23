import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StackKind = "highlight" | "deep_dive" | "expansion" | "persona" | "distill" | "note";

export interface StackItem {
  id: string;
  report_id: string;
  kind: StackKind;
  source: string | null;
  label: string;
  content: string;
  position: number;
  pinned: boolean;
  deleted_at: string | null;
  created_at: string;
  /** Which round of the simulation this insight came from. Stored client-side
   *  in `source` as `"<round>:<source>"` when persisted, parsed back on read. */
  round?: number;
}

export interface AddItemArgs {
  kind: StackKind;
  source?: string | null;
  label: string;
  content: string;
  pinned?: boolean;
  round?: number;
}

const LOCAL_KEY = "vibeco_stack_local";

interface UseVibeStackResult {
  items: StackItem[];
  loading: boolean;
  add: (args: AddItemArgs) => Promise<StackItem | null>;
  togglePin: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  hasItem: (kind: StackKind, source: string | null | undefined, label: string) => boolean;
}

/**
 * Hook for managing the Vibe Stack — curated insight chits attached to a report.
 * Falls back to localStorage when there is no reportId yet (e.g. mid-simulation).
 */
export function useVibeStack(reportId: string | null | undefined): UseVibeStackResult {
  const [items, setItems] = useState<StackItem[]>([]);
  const [loading, setLoading] = useState(false);

  const localKey = reportId ? `${LOCAL_KEY}_${reportId}` : LOCAL_KEY;

  // Encode/decode `round` inside the `source` column without a schema change:
  //   stored:    "r2|deep_dive_problem"   or just "r2|" for round-only.
  //   round-less items keep their source untouched.
  const encodeSource = (source: string | null | undefined, round?: number): string | null => {
    if (round == null) return source ?? null;
    return `r${round}|${source ?? ""}`;
  };
  const decodeItem = (raw: any): StackItem => {
    const src: string = raw?.source ?? "";
    const m = typeof src === "string" ? src.match(/^r(\d+)\|(.*)$/) : null;
    return {
      ...raw,
      source: m ? (m[2] || null) : (raw?.source ?? null),
      round: m ? Number(m[1]) : undefined,
    } as StackItem;
  };

  const refresh = useCallback(async () => {
    if (!reportId) {
      // Local-only fallback
      try {
        const raw = localStorage.getItem(localKey);
        setItems(raw ? (JSON.parse(raw) as StackItem[]) : []);
      } catch {
        setItems([]);
      }
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("idea_stack_items") as any)
        .select("*")
        .eq("report_id", reportId)
        .is("deleted_at", null)
        .order("position", { ascending: true });
      if (error) throw error;
      setItems(((data as any[]) || []).map(decodeItem));
    } catch (e) {
      console.error("Stack fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [reportId, localKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persistLocal = useCallback(
    (next: StackItem[]) => {
      try {
        localStorage.setItem(localKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [localKey],
  );

  const add = useCallback(
    async ({ kind, source = null, label, content, pinned = false, round }: AddItemArgs) => {
      const nextPosition = items.length;
      if (!reportId) {
        const local: StackItem = {
          id: crypto.randomUUID(),
          report_id: "",
          kind,
          source,
          label,
          content,
          position: nextPosition,
          pinned,
          deleted_at: null,
          created_at: new Date().toISOString(),
          round,
        };
        const next = [...items, local];
        setItems(next);
        persistLocal(next);
        return local;
      }
      try {
        const { data, error } = await (supabase.from("idea_stack_items") as any)
          .insert({
            report_id: reportId,
            kind,
            source: encodeSource(source, round),
            label,
            content,
            position: nextPosition,
            pinned,
          })
          .select()
          .single();
        if (error) throw error;
        const created = decodeItem(data);
        setItems((prev) => [...prev, created]);
        return created;
      } catch (e) {
        console.error("Stack add error:", e);
        return null;
      }
    },
    [items, reportId, persistLocal],
  );

  const togglePin = useCallback(
    async (id: string) => {
      const target = items.find((i) => i.id === id);
      if (!target) return;
      const next = items.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i));
      setItems(next);
      if (!reportId) {
        persistLocal(next);
        return;
      }
      try {
        await (supabase.from("idea_stack_items") as any)
          .update({ pinned: !target.pinned })
          .eq("id", id);
      } catch (e) {
        console.error("Stack pin error:", e);
      }
    },
    [items, reportId, persistLocal],
  );

  const remove = useCallback(
    async (id: string) => {
      const next = items.filter((i) => i.id !== id);
      setItems(next);
      if (!reportId) {
        persistLocal(next);
        return;
      }
      try {
        await (supabase.from("idea_stack_items") as any)
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);
      } catch (e) {
        console.error("Stack remove error:", e);
      }
    },
    [items, reportId, persistLocal],
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      const map = new Map(items.map((i) => [i.id, i]));
      const next: StackItem[] = orderedIds
        .map((id, idx) => {
          const it = map.get(id);
          return it ? { ...it, position: idx } : null;
        })
        .filter(Boolean) as StackItem[];
      setItems(next);
      if (!reportId) {
        persistLocal(next);
        return;
      }
      try {
        await Promise.all(
          next.map((it) =>
            (supabase.from("idea_stack_items") as any)
              .update({ position: it.position })
              .eq("id", it.id),
          ),
        );
      } catch (e) {
        console.error("Stack reorder error:", e);
      }
    },
    [items, reportId, persistLocal],
  );

  const hasItem = useCallback(
    (kind: StackKind, source: string | null | undefined, label: string) => {
      return items.some(
        (i) =>
          i.kind === kind &&
          (i.source || null) === (source || null) &&
          i.label === label,
      );
    },
    [items],
  );

  return { items, loading, add, togglePin, remove, reorder, refresh, hasItem };
}
