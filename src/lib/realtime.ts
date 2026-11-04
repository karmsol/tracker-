export type LiveEvent = {
  type: string;
  title?: string;
  body?: string;
  link?: string;
};

type Listener = (event: LiveEvent) => void;

const channels = new Map<string, Set<Listener>>();

export function publish(userId: string, event: LiveEvent) {
  const listeners = channels.get(userId);
  if (!listeners) return;
  for (const listener of listeners) listener(event);
}

export function subscribe(userId: string, listener: Listener) {
  const set = channels.get(userId) ?? new Set();
  set.add(listener);
  channels.set(userId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) channels.delete(userId);
  };
}
