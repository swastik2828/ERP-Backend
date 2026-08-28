import cron, { ScheduledTask } from 'node-cron';
import { outboxWorker } from '../../../infrastructure/outbox/outbox.worker';
import { notificationEventService } from '../services/notification-event.service';
import { notificationCleanupService } from '../services/notification-cleanup.service';

export class NotificationJobs {
  private static cleanupTask: ScheduledTask | null = null;

  public static initJobs(): void {
    // 1. Register domain event handlers with the central EventBus
    notificationEventService.registerWithEventBus();
    console.log('✅ Notification event subscribers registered with EventBus');

    // 2. Start the Outbox Worker for asynchronous event processing
    outboxWorker.start();

    // 3. Schedule Retention Cleanup Job to run daily at 02:00 AM
    this.cleanupTask = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 [NotificationRetentionCron] Running notification cleanup job...');
      try {
        await notificationCleanupService.cleanupOldNotifications();
      } catch (error) {
        console.error('❌ [NotificationRetentionCron] Error executing notification cleanup:', error);
      }
    });

    console.log('✅ Notification background jobs & cleanup schedule initialized.');
  }

  public static stopJobs(): void {
    outboxWorker.stop();
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      this.cleanupTask = null;
    }
    console.log('🛑 Notification background jobs stopped.');
  }
}
