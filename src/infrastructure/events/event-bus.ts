import { DomainEvent, EventHandler, IEventBus } from './event.interface';

export class EventBus implements IEventBus {
  private static instance: EventBus;
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe<T = Record<string, unknown>>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler<any>);
  }

  public unsubscribe(eventType: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  public async publish<T = Record<string, unknown>>(
    event: DomainEvent<T>
  ): Promise<void> {
    const specificHandlers = this.handlers.get(event.eventType) || new Set();
    const globalHandlers = this.handlers.get('*') || new Set();

    const allHandlers = [...specificHandlers, ...globalHandlers];

    if (allHandlers.length === 0) {
      return;
    }

    // Execute handlers asynchronously and isolate errors so one failing handler does not affect others
    const executionPromises = allHandlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          `[EventBus] Error in handler for event "${event.eventType}" (ID: ${event.eventId}):`,
          error
        );
        throw error;
      }
    });

    await Promise.all(executionPromises);
  }

  public clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = EventBus.getInstance();
