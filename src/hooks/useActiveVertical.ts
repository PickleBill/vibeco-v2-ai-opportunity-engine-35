import { useCallback, useEffect, useState } from "react";

/**
 * Active vertical (product_tag) shared across SignalBoard, Home scan handoff,
 * and the Idea Sketchpad. Persists to localStorage so the user lands back on
 * the same vertical between sessions.
 *
 * The product_tag is the same slug used by ingest-signal + signal_verticals
 * (see SignalBoard.clientSlug). null = "no vertical chosen yet" (sample mode).
 */
const KEY = "vibeco.activeVertical";

export function useActiveVertical(): [string | null, (v: string | null) => void] {
  const [tag, setTag] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (tag) window.localStorage.setItem(KEY, tag);
      else window.localStorage.removeItem(KEY);
    } catch {
      /* private mode, etc — non-fatal */
    }
  }, [tag]);

  const set = useCallback((v: string | null) => setTag(v), []);
  return [tag, set];
}
