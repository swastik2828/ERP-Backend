import { NotificationCategory, PrismaClient } from '@prisma/client';
import { NotificationRepository } from '../repositories/notification.repository';

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    repository = new NotificationRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('Cursor encoding and decoding', () => {
    it('should encode and decode cursor payload correctly', () => {
      const payload = {
        createdAt: '2026-08-19T10:00:00.000Z',
        id: 'notif-uuid-123',
      };

      const encoded = repository.encodeCursor(payload);
      expect(typeof encoded).toBe('string');

      const decoded = repository.decodeCursor(encoded);
      expect(decoded).toEqual(payload);
    });

    it('should return null for malformed cursor strings', () => {
      expect(repository.decodeCursor('invalid-base-64!!!')).toBeNull();
      expect(repository.decodeCursor(Buffer.from('{}').toString('base64'))).toBeNull();
    });
  });

  describe('findManyWithCursor', () => {
    it('should query prisma with tenant and recipient isolation', async () => {
      const mockNotifications = [
        {
          id: 'n-1',
          schoolId: 'school-1',
          recipientId: 'user-1',
          createdAt: new Date('2026-08-19T10:00:00Z'),
        },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await repository.findManyWithCursor({
        schoolId: 'school-1',
        recipientId: 'user-1',
        limit: 10,
        unread: true,
        category: NotificationCategory.ACADEMIC,
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-1',
          recipientId: 'user-1',
          isRead: false,
          category: NotificationCategory.ACADEMIC,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 11,
      });

      expect(result.items).toEqual(mockNotifications);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should calculate hasMore and nextCursor when items exceed limit', async () => {
      const mockNotifications = [
        { id: 'n-1', createdAt: new Date('2026-08-19T10:00:00Z') },
        { id: 'n-2', createdAt: new Date('2026-08-19T09:00:00Z') },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await repository.findManyWithCursor({
        schoolId: 'school-1',
        recipientId: 'user-1',
        limit: 1, // limit 1, received 2
      });

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeTruthy();
    });
  });

  describe('findByIdAndRecipient', () => {
    it('should query strictly by id, schoolId, and recipientId', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n-1' });

      await repository.findByIdAndRecipient('n-1', 'school-1', 'user-1');

      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'n-1',
          schoolId: 'school-1',
          recipientId: 'user-1',
        },
      });
    });
  });

  describe('countUnread', () => {
    it('should count unread notifications for recipient', async () => {
      mockPrisma.notification.count.mockResolvedValue(4);

      const count = await repository.countUnread('school-1', 'user-1');
      expect(count).toBe(4);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-1',
          recipientId: 'user-1',
          isRead: false,
        },
      });
    });
  });

  describe('createManyInBatches', () => {
    it('should chunk large inserts into batch sizes', async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const items = [
        { schoolId: 's', recipientId: 'r1', type: 'T', category: NotificationCategory.SYSTEM, title: 'T1', body: 'B1' },
        { schoolId: 's', recipientId: 'r2', type: 'T', category: NotificationCategory.SYSTEM, title: 'T2', body: 'B2' },
      ];

      const count = await repository.createManyInBatches(items, 1);
      expect(count).toBe(4); // 2 calls * 2 (each returning 2)
      expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteExpiredAndOldRead', () => {
    it('should execute cleanup for retention criteria', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 10 });
      const cutoff = new Date('2026-01-01');
      const now = new Date('2026-08-19');

      const deleted = await repository.deleteExpiredAndOldRead(cutoff, now);
      expect(deleted).toBe(10);
      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { isRead: true, readAt: { lte: cutoff } },
            { expiresAt: { lte: now } },
          ],
        },
      });
    });
  });
});
