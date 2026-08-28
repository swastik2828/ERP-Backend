import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;
  let mockRepo: jest.Mocked<NotificationPreferenceRepository>;

  beforeEach(() => {
    mockRepo = {
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findDisabledUserIdsForType: jest.fn(),
      upsertPreference: jest.fn(),
      bulkUpsertPreferences: jest.fn(),
    } as unknown as jest.Mocked<NotificationPreferenceRepository>;

    service = new NotificationPreferenceService(mockRepo);
  });

  describe('getUserPreferences', () => {
    it('should merge user saved preferences with registry defaults', async () => {
      mockRepo.findByUserId.mockResolvedValue([
        {
          id: 'pref-1',
          userId: 'user-1',
          notificationType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
          enabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getUserPreferences('user-1');

      const assignmentPref = result.find(
        (p) => p.notificationType === NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED
      );
      expect(assignmentPref?.enabled).toBe(false);

      const feePref = result.find(
        (p) => p.notificationType === NOTIFICATION_EVENT_TYPES.FEE_ASSIGNED
      );
      expect(feePref?.enabled).toBe(true); // Default enabled
    });

    it('should force enabled=true for mandatory notification types', async () => {
      mockRepo.findByUserId.mockResolvedValue([
        {
          id: 'pref-2',
          userId: 'user-1',
          notificationType: NOTIFICATION_EVENT_TYPES.SECURITY_ALERT,
          enabled: false, // Attempted to disable mandatory alert
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getUserPreferences('user-1');
      const securityAlert = result.find(
        (p) => p.notificationType === NOTIFICATION_EVENT_TYPES.SECURITY_ALERT
      );
      expect(securityAlert?.isMandatory).toBe(true);
      expect(securityAlert?.enabled).toBe(true);
    });
  });

  describe('updateUserPreferences', () => {
    it('should sanitize preferences and prevent disabling mandatory events', async () => {
      mockRepo.findByUserId.mockResolvedValue([]);

      await service.updatePreferences('user-1', [
        {
          notificationType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
          enabled: false,
        },
        {
          notificationType: NOTIFICATION_EVENT_TYPES.PASSWORD_CHANGED, // Mandatory!
          enabled: false,
        },
      ]);

      expect(mockRepo.bulkUpsertPreferences).toHaveBeenCalledWith('user-1', [
        {
          notificationType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
          enabled: false,
        },
        {
          notificationType: NOTIFICATION_EVENT_TYPES.PASSWORD_CHANGED,
          enabled: true, // Overridden to true
        },
      ]);
    });
  });

  describe('filterEligibleRecipients', () => {
    it('should bypass preference check if isMandatory is true', async () => {
      const recipients = ['u-1', 'u-2', 'u-3'];
      const eligible = await service.filterEligibleRecipients(
        'school-1',
        recipients,
        NOTIFICATION_EVENT_TYPES.SECURITY_ALERT,
        true // isMandatory
      );

      expect(eligible).toEqual(recipients);
      expect(mockRepo.findDisabledUserIdsForType).not.toHaveBeenCalled();
    });

    it('should filter out users who explicitly opted out of non-mandatory notifications', async () => {
      const recipients = ['u-1', 'u-2', 'u-3'];
      mockRepo.findDisabledUserIdsForType.mockResolvedValue(new Set(['u-2']));

      const eligible = await service.filterEligibleRecipients(
        'school-1',
        recipients,
        NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
        false // isMandatory
      );

      expect(eligible).toEqual(['u-1', 'u-3']);
      expect(mockRepo.findDisabledUserIdsForType).toHaveBeenCalledWith(
        recipients,
        NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED
      );
    });
  });
});
