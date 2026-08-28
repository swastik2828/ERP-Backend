import { Role } from '@prisma/client';
import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { SystemEventPayload } from '../events/notification.events';
import { NotificationRecipientService, notificationRecipientService } from '../services/notification-recipient.service';
import { INotificationHandler, ResolvedNotificationTarget } from './handler.interface';

export class SystemHandler implements INotificationHandler<SystemEventPayload> {
  constructor(
    private readonly recipientService: NotificationRecipientService = notificationRecipientService
  ) {}

  public canHandle(eventType: string): boolean {
    return [
      NOTIFICATION_EVENT_TYPES.ACCOUNT_CREATED,
      NOTIFICATION_EVENT_TYPES.PASSWORD_CHANGED,
      NOTIFICATION_EVENT_TYPES.SECURITY_ALERT,
      NOTIFICATION_EVENT_TYPES.SYSTEM_ANNOUNCEMENT,
    ].includes(eventType as any);
  }

  public async resolveTargets(
    event: DomainEvent<SystemEventPayload>
  ): Promise<ResolvedNotificationTarget[]> {
    const { schoolId, eventType, payload } = event;
    const targets: ResolvedNotificationTarget[] = [];

    if (eventType === NOTIFICATION_EVENT_TYPES.SYSTEM_ANNOUNCEMENT) {
      // Broadcast to all school users
      const allUserIds = await this.recipientService.resolveUsersByRoles(
        schoolId,
        [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT]
      );

      allUserIds.forEach((userId) => {
        targets.push({
          recipientId: userId,
          context: { ...payload },
          metadata: { alertType: payload.alertType },
        });
      });

      return targets;
    }

    // Individual system/security alerts
    if (payload.userId) {
      targets.push({
        recipientId: payload.userId,
        context: { ...payload },
        metadata: {
          ipAddress: payload.ipAddress,
          alertType: payload.alertType,
        },
      });
    }

    return targets;
  }
}

export const systemHandler = new SystemHandler();
