export function createStreamUiScheduler<T>(
  apply: (value: T) => void,
): {
  enqueue: (value: T) => void;
  flush: () => void;
  cancel: () => void;
} {
  let pending: T | null = null;
  let frame: number | null = null;

  const flush = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    if (pending === null) return;
    const value = pending;
    pending = null;
    apply(value);
  };

  const enqueue = (value: T) => {
    pending = value;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (pending === null) return;
      const next = pending;
      pending = null;
      apply(next);
    });
  };

  const cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    pending = null;
  };

  return { enqueue, flush, cancel };
}
