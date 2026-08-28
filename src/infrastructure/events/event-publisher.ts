import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../../database/prisma';
import { DomainEvent } from './event.interface';
import { eventBus } from './event-bus';

export class EventPublisher {
  /**
   * Publishes an event to the Transactional Outbox.
   * If a Prisma TransactionClient is passed, the event is saved within that transaction,
   * guaranteeing that the event is committed if and only if the business transaction commits.
   */
  public static async publish<T = Record<string, unknown>>(
    event: Omit<DomainEvent<T>, 'eventId' | 'occurredAt'> & {
      eventId?: string;
      occurredAt?: Date;
    },
    tx?: Prisma.TransactionClient
  ): Promise<DomainEvent<T>> {
    const client = tx || prisma;
    const eventId = event.eventId || randomUUID();
    const occurredAt = event.occurredAt || new Date();

    const fullEvent: DomainEvent<T> = {
      ...event,
      eventId,
      occurredAt,
    };

    await client.outboxEvent.create({
      data: {
        eventId: fullEvent.eventId,
        schoolId: fullEvent.schoolId,
        eventType: fullEvent.eventType,
        aggregateType: fullEvent.entityType,
        aggregateId: fullEvent.entityId || 'UNKNOWN',
        payload: fullEvent.payload as unknown as Prisma.InputJsonValue,
        status: 'PENDING',
        attempts: 0,
        availableAt: new Date(),
      },
    });

    return fullEvent;
  }

  /**
   * Publishes an event directly to the in-memory EventBus (for immediate synchronous processing or unit testing).
   */
  public static async publishImmediate<T = Record<string, unknown>>(
    event: DomainEvent<T>
  ): Promise<void> {
    await eventBus.publish(event);
  }
}
