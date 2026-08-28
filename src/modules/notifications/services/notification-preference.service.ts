import { NotificationPreferenceRepository, notificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { NotificationRegistry } from '../events/notification.registry';
import { PreferenceItemDto, UserPreferenceResponseDto } from '../dtos/notification-preference.dto';

export class NotificationPreferenceService {
  constructor(
    private readonly preferenceRepo: NotificationPreferenceRepository = notificationPreferenceRepository
  ) {}

  public async getUserPreferences(
    userId: string
  ): Promise<UserPreferenceResponseDto[]> {
    const savedPrefs = await this.preferenceRepo.findByUserId(userId);
    const savedMap = new Map<string, boolean>();
    savedPrefs.forEach((p) => savedMap.set(p.notificationType, p.enabled));

    const allEventConfigs = NotificationRegistry.getAll();

    return allEventConfigs.map((config) => {
      const isSaved = savedMap.has(config.eventType);
      const isEnabled = isSaved ? savedMap.get(config.eventType)! : true;

      return {
        notificationType: config.eventType,
        category: config.category,
        enabled: config.isMandatory ? true : isEnabled,
        isMandatory: config.isMandatory,
        description: config.description,
      };
    });
  }

  public async updateUserPreferences(
    userId: string,
    preferences: PreferenceItemDto[]
  ): Promise<UserPreferenceResponseDto[]> {
    // Enforce Rule: Mandatory notifications cannot be disabled
    const sanitizedPreferences = preferences.map((pref) => {
      const isMandatory = NotificationRegistry.isMandatory(pref.notificationType);
      return {
        notificationType: pref.notificationType,
        enabled: isMandatory ? true : pref.enabled,
      };
    });

    await this.preferenceRepo.bulkUpsertPreferences(
      userId,
      sanitizedPreferences
    );

    return this.getUserPreferences(userId);
  }

  public async updatePreferences(
    userId: string,
    preferences: PreferenceItemDto[]
  ): Promise<UserPreferenceResponseDto[]> {
    return this.updateUserPreferences(userId, preferences);
  }

  public async filterEligibleRecipients(
    _schoolId: string,
    recipientUserIds: string[],
    notificationType: string,
    isMandatory: boolean
  ): Promise<string[]> {
    if (recipientUserIds.length === 0) {
      return [];
    }

    // Deduplicate recipient IDs first
    const uniqueRecipientIds = Array.from(new Set(recipientUserIds));

    // Mandatory notifications bypass user preference disabling
    if (isMandatory) {
      return uniqueRecipientIds;
    }

    const disabledUserIds =
      await this.preferenceRepo.findDisabledUserIdsForType(
        uniqueRecipientIds,
        notificationType
      );

    if (disabledUserIds.size === 0) {
      return uniqueRecipientIds;
    }

    return uniqueRecipientIds.filter((id) => !disabledUserIds.has(id));
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
