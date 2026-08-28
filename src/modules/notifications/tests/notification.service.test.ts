import { NotificationCategory, NotificationPriority, Role } from '@prisma/client';
import { NotificationService } from '../services/notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationRecipientService } from '../services/notification-recipient.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { AppError } from '../../../errors/AppError';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockNotificationRepo: jest.Mocked<NotificationRepository>;
  let mockRecipientService: jest.Mocked<NotificationRecipientService>;
  let mockPreferenceService: jest.Mocked<NotificationPreferenceService>;

  const schoolId = 'school-123';
  const recipientId = 'user-456';
  const notificationId = 'notif-789';

  beforeEach(() => {
    mockNotificationRepo = {
      findManyWithCursor: jest.fn(),
      findByIdAndRecipient: jest.fn(),
      countUnread: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      archive: jest.fn(),
      createManyInBatches: jest.fn(),
      findExistingRecipientIdsForEvent: jest.fn(),
      deleteExpiredAndOldRead: jest.fn(),
      encodeCursor: jest.fn(),
      decodeCursor: jest.fn(),
    } as unknown as jest.Mocked<NotificationRepository>;

    mockRecipientService = {
      resolveStudentsInClass: jest.fn(),
      resolveParentsOfStudents: jest.fn(),
      resolveParentsForSingleStudent: jest.fn(),
      resolveTeachersForClass: jest.fn(),
      resolveUsersByRoles: jest.fn(),
      resolveTeacherUserId: jest.fn(),
    } as unknown as jest.Mocked<NotificationRecipientService>;

    mockPreferenceService = {
      getUserPreferences: jest.fn(),
      updateUserPreferences: jest.fn(),
      filterEligibleRecipients: jest.fn(),
    } as unknown as jest.Mocked<NotificationPreferenceService>;

    service = new NotificationService(
      mockNotificationRepo,
      mockRecipientService,
      mockPreferenceService
    );
  });

  describe('getNotifications', () => {
    it('should retrieve notifications with cursor pagination and metadata', async () => {
      const mockItems = [
        {
          id: 'notif-1',
          schoolId,
          recipientId,
          type: 'ASSIGNMENT_PUBLISHED',
          category: NotificationCategory.ACADEMIC,
          title: 'Math Homework',
          body: 'New homework assigned',
          entityType: 'ASSIGNMENT',
          entityId: 'assign-1',
          metadata: { assignmentId: 'assign-1' },
          priority: NotificationPriority.NORMAL,
          isRead: false,
          readAt: null,
          expiresAt: null,
          createdAt: new Date('2026-08-19T10:00:00Z'),
          updatedAt: new Date('2026-08-19T10:00:00Z'),
        },
      ];

      mockNotificationRepo.findManyWithCursor.mockResolvedValue({
        items: mockItems,
        nextCursor: 'encoded-cursor-string',
        hasMore: true,
      });

      const result = await service.getNotifications(schoolId, recipientId, {
        limit: 20,
        unread: true,
      });

      expect(mockNotificationRepo.findManyWithCursor).toHaveBeenCalledWith({
        schoolId,
        recipientId,
        cursor: undefined,
        limit: 20,
        unread: true,
        category: undefined,
        type: undefined,
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].id).toBe('notif-1');
      expect(result.pagination.nextCursor).toBe('encoded-cursor-string');
      expect(result.pagination.hasMore).toBe(true);
    });
  });

  describe('getNotificationById', () => {
    it('should return notification when found for tenant and user', async () => {
      mockNotificationRepo.findByIdAndRecipient.mockResolvedValue({
        id: notificationId,
        schoolId,
        recipientId,
        type: 'FEE_DUE_SOON',
        category: NotificationCategory.FEES,
        title: 'Fee Reminder',
        body: 'Term fee is due',
        entityType: 'FEE',
        entityId: 'fee-1',
        metadata: null,
        priority: NotificationPriority.HIGH,
        isRead: false,
        readAt: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getNotificationById(
        notificationId,
        schoolId,
        recipientId
      );

      expect(result.id).toBe(notificationId);
      expect(result.category).toBe(NotificationCategory.FEES);
    });

    it('should throw AppError 404 if notification is not found', async () => {
      mockNotificationRepo.findByIdAndRecipient.mockResolvedValue(null);

      await expect(
        service.getNotificationById(notificationId, schoolId, recipientId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user and school', async () => {
      mockNotificationRepo.countUnread.mockResolvedValue(5);

      const result = await service.getUnreadCount(schoolId, recipientId);
      expect(result.count).toBe(5);
      expect(mockNotificationRepo.countUnread).toHaveBeenCalledWith(
        schoolId,
        recipientId
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read idempotently', async () => {
      mockNotificationRepo.findByIdAndRecipient.mockResolvedValue({
        id: notificationId,
        schoolId,
        recipientId,
        isRead: false,
      } as any);

      mockNotificationRepo.markAsRead.mockResolvedValue(1);

      const result = await service.markAsRead(
        notificationId,
        schoolId,
        recipientId
      );

      expect(result.success).toBe(true);
      expect(result.isRead).toBe(true);
      expect(mockNotificationRepo.markAsRead).toHaveBeenCalledWith(
        notificationId,
        schoolId,
        recipientId
      );
    });

    it('should throw AppError 404 if notification to mark read does not exist', async () => {
      mockNotificationRepo.findByIdAndRecipient.mockResolvedValue(null);

      await expect(
        service.markAsRead(notificationId, schoolId, recipientId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('markAllAsRead', () => {
    it('should call repo to mark all notifications as read in a single query', async () => {
      mockNotificationRepo.markAllAsRead.mockResolvedValue(12);

      const result = await service.markAllAsRead(schoolId, recipientId);

      expect(result.updatedCount).toBe(12);
      expect(mockNotificationRepo.markAllAsRead).toHaveBeenCalledWith(
        schoolId,
        recipientId
      );
    });
  });

  describe('archiveNotification', () => {
    it('should archive notification successfully', async () => {
      mockNotificationRepo.findByIdAndRecipient.mockResolvedValue({
        id: notificationId,
        schoolId,
        recipientId,
      } as any);

      mockNotificationRepo.archive.mockResolvedValue(1);

      const result = await service.archiveNotification(
        notificationId,
        schoolId,
        recipientId
      );

      expect(result.success).toBe(true);
      expect(mockNotificationRepo.archive).toHaveBeenCalledWith(
        notificationId,
        schoolId,
        recipientId
      );
    });
  });

  describe('sendManualNotification', () => {
    it('should resolve roles and broadcast manual notifications', async () => {
      mockRecipientService.resolveUsersByRoles.mockResolvedValue([
        'user-1',
        'user-2',
      ]);
      mockPreferenceService.filterEligibleRecipients.mockResolvedValue([
        'user-1',
        'user-2',
      ]);
      mockNotificationRepo.createManyInBatches.mockResolvedValue(2);

      const result = await service.sendManualNotification(
        schoolId,
        'admin-user',
        {
          title: 'School Closure',
          body: 'School will remain closed tomorrow due to heavy rain.',
          category: NotificationCategory.SYSTEM,
          roles: [Role.PARENT, Role.TEACHER],
        }
      );

      expect(result.createdCount).toBe(2);
      expect(mockRecipientService.resolveUsersByRoles).toHaveBeenCalledWith(
        schoolId,
        [Role.PARENT, Role.TEACHER]
      );
      expect(mockNotificationRepo.createManyInBatches).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipientId: 'user-1',
            title: 'School Closure',
          }),
          expect.objectContaining({
            recipientId: 'user-2',
            title: 'School Closure',
          }),
        ])
      );
    });
  });
});
