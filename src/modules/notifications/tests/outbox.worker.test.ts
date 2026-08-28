import { OutboxEventStatus } from '@prisma/client';
import { OutboxWorker } from '../../../infrastructure/outbox/outbox.worker';
import { OutboxRepository } from '../repositories/outbox.repository';
import { eventBus } from '../../../infrastructure/events/event-bus';

describe('OutboxWorker', () => {
  let worker: OutboxWorker;
  let mockOutboxRepo: jest.Mocked<OutboxRepository>;

  beforeEach(() => {
    mockOutboxRepo = {
      fetchPendingEvents: jest.fn(),
      markAsProcessing: jest.fn(),
      markAsProcessed: jest.fn(),
      markAsFailed: jest.fn(),
      markAsDeadLetter: jest.fn(),
      create: jest.fn(),
      findByEventId: jest.fn(),
      countByStatus: jest.fn(),
    } as unknown as jest.Mocked<OutboxRepository>;

    worker = new OutboxWorker(mockOutboxRepo, {
      pollIntervalMs: 1000,
      maxAttempts: 3,
      batchSize: 10,
    });
  });

  afterEach(() => {
    worker.stop();
  });

  describe('processPendingEvents', () => {
    it('should fetch pending events, publish to eventBus, and mark as processed', async () => {
      const mockEvents = [
        {
          id: 'outbox-1',
          eventId: 'evt-1',
          schoolId: 'school-1',
          eventType: 'ASSIGNMENT_PUBLISHED',
          aggregateType: 'ASSIGNMENT',
          aggregateId: 'assign-1',
          payload: { title: 'Algebra' },
          status: OutboxEventStatus.PENDING,
          attempts: 0,
          lastError: null,
          availableAt: new Date(),
          processedAt: null,
          failedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockOutboxRepo.fetchPendingEvents.mockResolvedValue(mockEvents);
      mockOutboxRepo.markAsProcessing.mockResolvedValue(1);
      mockOutboxRepo.markAsProcessed.mockResolvedValue({} as any);

      const publishSpy = jest
        .spyOn(eventBus, 'publish')
        .mockResolvedValue(undefined);

      const processedCount = await worker.processPendingEvents();

      expect(processedCount).toBe(1);
      expect(mockOutboxRepo.markAsProcessing).toHaveBeenCalledWith(['outbox-1']);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'evt-1',
          eventType: 'ASSIGNMENT_PUBLISHED',
          schoolId: 'school-1',
        })
      );
      expect(mockOutboxRepo.markAsProcessed).toHaveBeenCalledWith('outbox-1');
      publishSpy.mockRestore();
    });

    it('should retry with backoff on failure and record attempt', async () => {
      const mockEvents = [
        {
          id: 'outbox-1',
          eventId: 'evt-1',
          schoolId: 'school-1',
          eventType: 'ASSIGNMENT_PUBLISHED',
          aggregateType: 'ASSIGNMENT',
          aggregateId: 'assign-1',
          payload: {},
          status: OutboxEventStatus.PENDING,
          attempts: 0, // 1st attempt failing
          lastError: null,
          availableAt: new Date(),
          processedAt: null,
          failedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockOutboxRepo.fetchPendingEvents.mockResolvedValue(mockEvents);
      mockOutboxRepo.markAsProcessing.mockResolvedValue(1);

      const publishSpy = jest
        .spyOn(eventBus, 'publish')
        .mockRejectedValue(new Error('Database timeout'));

      await worker.processPendingEvents();

      expect(mockOutboxRepo.markAsFailed).toHaveBeenCalledWith(
        'outbox-1',
        'Database timeout',
        expect.any(Date),
        1 // Current attempt
      );
      publishSpy.mockRestore();
    });

    it('should mark as DEAD_LETTER when maximum retry attempts exceeded', async () => {
      const mockEvents = [
        {
          id: 'outbox-1',
          eventId: 'evt-1',
          schoolId: 'school-1',
          eventType: 'ASSIGNMENT_PUBLISHED',
          aggregateType: 'ASSIGNMENT',
          aggregateId: 'assign-1',
          payload: {},
          status: OutboxEventStatus.FAILED,
          attempts: 2, // 3rd attempt failing with maxAttempts=3
          lastError: 'Previous error',
          availableAt: new Date(),
          processedAt: null,
          failedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockOutboxRepo.fetchPendingEvents.mockResolvedValue(mockEvents);
      mockOutboxRepo.markAsProcessing.mockResolvedValue(1);

      const publishSpy = jest
        .spyOn(eventBus, 'publish')
        .mockRejectedValue(new Error('Fatal exception'));

      await worker.processPendingEvents();

      expect(mockOutboxRepo.markAsDeadLetter).toHaveBeenCalledWith(
        'outbox-1',
        'Fatal exception',
        3
      );
      publishSpy.mockRestore();
    });
  });
});
