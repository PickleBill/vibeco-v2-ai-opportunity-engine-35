import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useVariant<T extends string>(
  key: string,
  variants: readonly T[]
): T {
  const [searchParams] = useSearchParams();
  const [sticky] = useState<T>(() => {
    const param = searchParams.get("variant") as T | null;
    if (param && variants.includes(param)) {
      localStorage.setItem(`variant:${key}`, param);
      return param;
    }
    const stored = localStorage.getItem(`variant:${key}`) as T | null;
    if (stored && variants.includes(stored)) return stored;
    const picked = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem(`variant:${key}`, picked);
    return picked;
  });
  return sticky;
}
