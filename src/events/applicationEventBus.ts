import type { ApplicationEvent, ApplicationEventOf, ApplicationEventType } from './applicationEvents';

type Handler<TEvent extends ApplicationEvent> = (event: TEvent) => void;
type HandlerMap = Partial<Record<ApplicationEventType, Set<Handler<ApplicationEvent>>>>;

const handlers: HandlerMap = {};

export function publishApplicationEvent<TEvent extends ApplicationEvent>(event: TEvent): void {
  const listeners = handlers[event.type] as Set<Handler<TEvent>> | undefined;
  if (!listeners) return;

  for (const listener of Array.from(listeners)) {
    try {
      listener(event);
    } catch (error) {
      console.error(`[ApplicationEventBus] ${event.type} handler failed`, error);
    }
  }
}

export function subscribeApplicationEvent<TType extends ApplicationEventType>(
  type: TType,
  handler: Handler<ApplicationEventOf<TType>>,
): () => void {
  const listeners = (handlers[type] ||= new Set()) as Set<Handler<ApplicationEventOf<TType>>>;
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function clearApplicationEventHandlers(): void {
  for (const listeners of Object.values(handlers)) listeners?.clear();
}
