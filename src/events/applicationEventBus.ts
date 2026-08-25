import type { ApplicationEvent, ApplicationEventOf, ApplicationEventType } from './applicationEvents';

type Handler<TEvent extends ApplicationEvent> = (event: TEvent) => void;
type HandlerMap = Partial<Record<ApplicationEventType, Set<Handler<ApplicationEvent>>>>;

const handlers: HandlerMap = {};

export function publishApplicationEvent<TEvent extends ApplicationEvent>(event: TEvent): void {
  const listeners = handlers[event.type];
  if (!listeners) return;

  for (const listener of Array.from(listeners)) {
    try {
      (listener as Handler<TEvent>)(event);
    } catch (error) {
      console.error(`[ApplicationEventBus] ${event.type} handler failed`, error);
    }
  }
}

export function subscribeApplicationEvent<TType extends ApplicationEventType>(
  type: TType,
  handler: Handler<ApplicationEventOf<TType>>,
): () => void {
  const listeners = (handlers[type] ||= new Set<Handler<ApplicationEvent>>());
  listeners.add(handler as unknown as Handler<ApplicationEvent>);
  return () => listeners.delete(handler as unknown as Handler<ApplicationEvent>);
}

export function clearApplicationEventHandlers(): void {
  for (const listeners of Object.values(handlers)) listeners?.clear();
}
