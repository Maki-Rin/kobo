export interface PollingEnvironment {
  visible(): boolean;
  subscribe(callback: () => void): () => void;
  schedule(callback: () => void, delay: number): () => void;
}

const browserEnvironment: PollingEnvironment = {
  visible: () => document.visibilityState === 'visible',
  subscribe(callback) {
    document.addEventListener('visibilitychange', callback);
    return () => document.removeEventListener('visibilitychange', callback);
  },
  schedule(callback, delay) {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
};

export function pollWhileVisible(
  run: (signal: AbortSignal) => Promise<void>,
  { immediate = true, interval = 30_000, environment = browserEnvironment } = {}
): () => void {
  let disposed = false;
  let cancelTimer: (() => void) | undefined;
  let request: AbortController | undefined;

  const schedule = () => {
    if (!disposed && environment.visible()) cancelTimer = environment.schedule(() => { void tick(); }, interval);
  };
  const tick = async () => {
    cancelTimer?.();
    cancelTimer = undefined;
    if (disposed || !environment.visible() || request) return;
    const current = new AbortController();
    request = current;
    try {
      await run(current.signal);
    } catch {
      // The caller handles display errors; a failed request must not stop polling.
    } finally {
      if (request === current) {
        request = undefined;
        schedule();
      }
    }
  };
  const unsubscribe = environment.subscribe(() => {
    cancelTimer?.();
    cancelTimer = undefined;
    if (!environment.visible()) {
      request?.abort();
      request = undefined;
    } else {
      void tick();
    }
  });
  if (immediate) void tick();
  else schedule();
  return () => {
    disposed = true;
    cancelTimer?.();
    request?.abort();
    request = undefined;
    unsubscribe();
  };
}
