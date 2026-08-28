import { NotificationRepository, notificationRepository } from '../repositories/notification.repository';
import { NOTIFICATION_CONFIG } from '../constants/notification.constants';

export class NotificationCleanupService {
  constructor(
    private readonly notificationRepo: NotificationRepository = notificationRepository
  ) {}

  public async cleanupOldNotifications(
    retentionDays: number = NOTIFICATION_CONFIG.READ_RETENTION_DAYS
  ): Promise<number> {
    const now = new Date();
    const readRetentionCutoff = new Date(
      now.getTime() - retentionDays * 24 * 60 * 60 * 1000
    );

    const deletedCount = await this.notificationRepo.deleteExpiredAndOldRead(
      readRetentionCutoff,
      now
    );

    if (deletedCount > 0) {
      console.log(
        `[NotificationCleanup] Pruned ${deletedCount} expired and aged read notifications.`
      );
    }

    return deletedCount;
  }
}

export const notificationCleanupService = new NotificationCleanupService();
