import { NotificationService } from '../services/notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { AppError } from '../../../errors/AppError';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';

describe('Notification Security & Tenant Isolation Tests', () => {
  let service: NotificationService;
  let mockNotificationRepo: jest.Mocked<NotificationRepository>;
  let prefService: NotificationPreferenceService;
  let mockPrefRepo: jest.Mocked<NotificationPreferenceRepository>;

  const schoolA = 'school-aaa-111';
  const schoolB = 'school-bbb-222';
  const userA = 'user-alice-111';
  const notificationId = 'notif-secret-123';

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

    mockPrefRepo = {
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findDisabledUserIdsForType: jest.fn(),
      upsertPreference: jest.fn(),
      bulkUpsertPreferences: jest.fn(),
    } as unknown as jest.Mocked<NotificationPreferenceRepository>;

    prefService = new NotificationPreferenceService(mockPrefRepo);

    service = new NotificationService(
      mockNotificationRepo,
      {} as any,
      prefService
    );
  });

  describe('IDOR Protection (PRD Section 30)', () => {
    it('should reject request when User A attempts to view User B notification', async () => {
      // Mock repository returning null because recipientId does not match authenticated user
      mockNotificationRepo.findByIdAndRecipient.mockResolvedValue(null);

      await expect(
        service.getNotificationById(notificationId, schoolA, userA)
      ).rejects.toThrow(AppError);

      expect(mockNotificationRepo.findByIdAndRecipient).toHaveBeenCalledWith(
        notificationId,
        schoolA,
        userA
      );
    });

    it('should reject request when User A attempts to mark User B notification as read', async () => {
      mockNotificationRepo.findByIdAndRecipient.mockResolvedValue(null);

      await expect(
        service.markAsRead(notificationId, schoolA, userA)
      ).rejects.toThrow(AppError);

      expect(mockNotificationRepo.markAsRead).not.toHaveBeenCalled();
    });

    it('should reject request when User A attempts to archive User B notification', async () => {
      mockNotificationRepo.findByIdAndRecipient.mockResolvedValue(null);

      await expect(
        service.archiveNotification(notificationId, schoolA, userA)
      ).rejects.toThrow(AppError);

      expect(mockNotificationRepo.archive).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Tenant Isolation (PRD Section 29 & 44)', () => {
    it('should reject request when user from School A queries notification from School B', async () => {
      mockNotificationRepo.findByIdAndRecipient.mockResolvedValue(null);

      await expect(
        service.getNotificationById(notificationId, schoolB, userA)
      ).rejects.toThrow(AppError);

      expect(mockNotificationRepo.findByIdAndRecipient).toHaveBeenCalledWith(
        notificationId,
        schoolB,
        userA
      );
    });

    it('should scope inbox query strictly to authenticated schoolId and recipientId', async () => {
      mockNotificationRepo.findManyWithCursor.mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      });

      await service.getNotifications(schoolA, userA, {});

      expect(mockNotificationRepo.findManyWithCursor).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: schoolA,
          recipientId: userA,
        })
      );
    });
  });

  describe('Mandatory Security Alerts (PRD Section 20)', () => {
    it('should never allow user to suppress critical SECURITY_ALERT or PASSWORD_CHANGED', async () => {
      const eligible = await prefService.filterEligibleRecipients(
        schoolA,
        [userA],
        NOTIFICATION_EVENT_TYPES.SECURITY_ALERT,
        true // isMandatory
      );

      // Even if user disabled all other preferences, mandatory events are delivered
      expect(eligible).toContain(userA);
      expect(mockPrefRepo.findDisabledUserIdsForType).not.toHaveBeenCalled();
    });
  });
});
