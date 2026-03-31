type EventCallback<T> = (event: { payload: T; event: string; id: number }) => void;
type UnlistenFn = () => void;

const listeners = new Map<string, Set<EventCallback<unknown>>>();
let nextId = 0;

export function listen<T>(
  event: string,
  handler: EventCallback<T>,
): Promise<UnlistenFn> {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  const set = listeners.get(event)!;
  set.add(handler as EventCallback<unknown>);

  return Promise.resolve(() => {
    set.delete(handler as EventCallback<unknown>);
  });
}

export function emit(event: string, payload?: unknown): void {
  const set = listeners.get(event);
  if (!set) return;
  const id = nextId++;
  for (const handler of set) {
    handler({ payload, event, id });
  }
}

export function once<T>(
  event: string,
  handler: EventCallback<T>,
): Promise<UnlistenFn> {
  const wrappedHandler: EventCallback<T> = (e) => {
    handler(e);
    const set = listeners.get(event);
    if (set) set.delete(wrappedHandler as EventCallback<unknown>);
  };

  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(wrappedHandler as EventCallback<unknown>);

  return Promise.resolve(() => {
    const set = listeners.get(event);
    if (set) set.delete(wrappedHandler as EventCallback<unknown>);
  });
}
