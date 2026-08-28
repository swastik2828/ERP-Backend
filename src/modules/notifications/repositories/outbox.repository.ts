import { OutboxEvent, OutboxEventStatus, Prisma } from '@prisma/client';
import prisma from '../../../database/prisma';

export class OutboxRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  public async create(
    data: Prisma.OutboxEventCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<OutboxEvent> {
    const client = tx || this.db;
    return client.outboxEvent.create({ data });
  }

  public async fetchPendingEvents(
    limit: number = 50,
    maxAttempts: number = 3
  ): Promise<OutboxEvent[]> {
    const now = new Date();
    return this.db.outboxEvent.findMany({
      where: {
        status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED] },
        availableAt: { lte: now },
        attempts: { lt: maxAttempts },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  public async markAsProcessing(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.db.outboxEvent.updateMany({
      where: { id: { in: ids } },
      data: { status: OutboxEventStatus.PROCESSING },
    });
    return result.count;
  }

  public async markAsProcessed(id: string): Promise<OutboxEvent> {
    return this.db.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  public async markAsFailed(
    id: string,
    error: string,
    nextAvailableAt: Date,
    attempts: number
  ): Promise<OutboxEvent> {
    return this.db.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.FAILED,
        lastError: error,
        failedAt: new Date(),
        attempts,
        availableAt: nextAvailableAt,
      },
    });
  }

  public async markAsDeadLetter(
    id: string,
    error: string,
    attempts: number
  ): Promise<OutboxEvent> {
    return this.db.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.DEAD_LETTER,
        lastError: error,
        failedAt: new Date(),
        attempts,
      },
    });
  }

  public async findByEventId(eventId: string): Promise<OutboxEvent | null> {
    return this.db.outboxEvent.findUnique({
      where: { eventId },
    });
  }

  public async countByStatus(status: OutboxEventStatus): Promise<number> {
    return this.db.outboxEvent.count({
      where: { status },
    });
  }
}

export const outboxRepository = new OutboxRepository();
