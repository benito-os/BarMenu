export const CHUNK_RELOAD_KEY = "barflores:chunk-reload";
export const CHUNK_RELOAD_WINDOW_MS = 30_000;

/**
 * Decide whether a failed lazy-chunk load should trigger a page reload.
 * True when no reload was recorded, or the last one is older than 30s.
 * A reload inside the window means the new build is also broken, so we stop
 * instead of looping.
 */
export function shouldReloadOnChunkError(lastReloadAt: number | null, now: number): boolean {
  if (lastReloadAt === null || !Number.isFinite(lastReloadAt)) return true;
  return now - lastReloadAt > CHUNK_RELOAD_WINDOW_MS;
}

/**
 * Handler for Vite's `vite:preloadError` event. Reloads at most once per
 * 30s per tab. If sessionStorage is unavailable we cannot guard against a
 * loop, so we do not reload. The key is deliberately never cleared on mount.
 */
export function handleChunkPreloadError(event: Event): void {
  let lastReloadAt: number | null = null;
  try {
    const raw = window.sessionStorage.getItem(CHUNK_RELOAD_KEY);
    lastReloadAt = raw === null ? null : Number(raw);
    if (lastReloadAt !== null && Number.isNaN(lastReloadAt)) lastReloadAt = null;
    const now = Date.now();
    if (!shouldReloadOnChunkError(lastReloadAt, now)) return;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
}
