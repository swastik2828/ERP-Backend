import { OutboxEvent } from '@prisma/client';
import { OutboxRepository, outboxRepository } from '../../modules/notifications/repositories/outbox.repository';
import { eventBus } from '../events/event-bus';
import { DomainEvent } from '../events/event.interface';

export class OutboxWorker {
  private isProcessing = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private readonly maxAttempts: number;
  private readonly batchSize: number;

  constructor(
    private readonly repo: OutboxRepository = outboxRepository,
    options?: {
      pollIntervalMs?: number;
      maxAttempts?: number;
      batchSize?: number;
    }
  ) {
    this.pollIntervalMs = options?.pollIntervalMs ?? 3000;
    this.maxAttempts = options?.maxAttempts ?? 4;
    this.batchSize = options?.batchSize ?? 50;
  }

  /**
   * Calculates the next backoff retry delay.
   * Attempt 1: 5s
   * Attempt 2: 30s
   * Attempt 3: 300s (5 min)
   * Beyond: Dead Letter
   */
  public calculateNextRetry(attempt: number): number {
    switch (attempt) {
      case 1:
        return 5 * 1000; // 5 seconds
      case 2:
        return 30 * 1000; // 30 seconds
      case 3:
        return 300 * 1000; // 5 minutes
      default:
        return 600 * 1000; // 10 minutes
    }
  }

  public start(): void {
    if (this.intervalTimer) {
      return;
    }
    console.log(`[OutboxWorker] Started with polling interval ${this.pollIntervalMs}ms`);
    this.intervalTimer = setInterval(() => {
      this.processPendingEvents().catch((err) => {
        console.error('[OutboxWorker] Error during poll execution:', err);
      });
    }, this.pollIntervalMs);

    // Unref timer so it doesn't prevent Node process from exiting
    if (this.intervalTimer.unref) {
      this.intervalTimer.unref();
    }
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      console.log('[OutboxWorker] Stopped.');
    }
  }

  public async processPendingEvents(): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      const pendingEvents = await this.repo.fetchPendingEvents(
        this.batchSize,
        this.maxAttempts
      );

      if (pendingEvents.length === 0) {
        return 0;
      }

      // Mark fetched batch as processing
      const eventIds = pendingEvents.map((e) => e.id);
      await this.repo.markAsProcessing(eventIds);

      for (const eventRecord of pendingEvents) {
        await this.processSingleEvent(eventRecord);
        processedCount++;
      }
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  private async processSingleEvent(eventRecord: OutboxEvent): Promise<void> {
    const startTime = Date.now();
    const currentAttempt = eventRecord.attempts + 1;

    try {
      const domainEvent: DomainEvent<any> = {
        eventId: eventRecord.eventId,
        eventType: eventRecord.eventType,
        schoolId: eventRecord.schoolId,
        entityType: eventRecord.aggregateType,
        entityId: eventRecord.aggregateId,
        payload: (eventRecord.payload as Record<string, unknown>) || {},
        occurredAt: eventRecord.createdAt,
      };

      // Dispatch to event bus
      await eventBus.publish(domainEvent);

      // Successfully processed
      await this.repo.markAsProcessed(eventRecord.id);

      const durationMs = Date.now() - startTime;
      console.log(
        `[OutboxWorker] Event processed successfully: ${eventRecord.eventType} (EventID: ${eventRecord.eventId}, Duration: ${durationMs}ms)`
      );
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const durationMs = Date.now() - startTime;
      console.error(
        `[OutboxWorker] Event processing failed (Attempt ${currentAttempt}/${this.maxAttempts}): ${eventRecord.eventType} (EventID: ${eventRecord.eventId}, Duration: ${durationMs}ms) - Error: ${errorMessage}`
      );

      if (currentAttempt >= this.maxAttempts) {
        await this.repo.markAsDeadLetter(
          eventRecord.id,
          errorMessage,
          currentAttempt
        );
        console.error(
          `[OutboxWorker] Event moved to DEAD_LETTER: ${eventRecord.eventId}`
        );
      } else {
        const delayMs = this.calculateNextRetry(currentAttempt);
        const nextAvailableAt = new Date(Date.now() + delayMs);
        await this.repo.markAsFailed(
          eventRecord.id,
          errorMessage,
          nextAvailableAt,
          currentAttempt
        );
      }
    }
  }
}

export const outboxWorker = new OutboxWorker();
