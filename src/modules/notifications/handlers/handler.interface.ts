import { DomainEvent } from '../../../infrastructure/events/event.interface';

export interface ResolvedNotificationTarget {
  recipientId: string;
  context: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface INotificationHandler<T = any> {
  canHandle(eventType: string): boolean;
  resolveTargets(event: DomainEvent<T>): Promise<ResolvedNotificationTarget[]>;
}
