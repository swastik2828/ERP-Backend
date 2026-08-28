export interface DomainEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  schoolId: string;
  actorId?: string;
  entityType: string;
  entityId?: string;
  payload: T;
  occurredAt: Date;
}

export type EventHandler<T = Record<string, unknown>> = (event: DomainEvent<T>) => Promise<void>;

export interface IEventBus {
  subscribe<T = Record<string, unknown>>(eventType: string, handler: EventHandler<T>): void;
  publish<T = Record<string, unknown>>(event: DomainEvent<T>): Promise<void>;
  unsubscribe(eventType: string, handler: EventHandler): void;
}
