import { useCallback, useState } from "react";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/**
 * useState that remembers its value per browser (last-used menu, filter...).
 * Storage can be missing or throw (private mode, blocked site data); the hook
 * then behaves exactly like useState.
 */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() =>
    typeof window === "undefined" ? fallback : read(key, fallback),
  );
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // best effort
        }
        return resolved;
      });
    },
    [key],
  );
  return [value, set] as const;
}
