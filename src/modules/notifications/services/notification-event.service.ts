import { NotificationCategory, NotificationPriority, Prisma } from '@prisma/client';
import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { eventBus } from '../../../infrastructure/events/event-bus';
import { NotificationRegistry } from '../events/notification.registry';
import { NotificationTemplateService, notificationTemplateService } from './notification-template.service';
import { NotificationPreferenceService, notificationPreferenceService } from './notification-preference.service';
import { NotificationRepository, notificationRepository } from '../repositories/notification.repository';
import { INotificationHandler, ResolvedNotificationTarget } from '../handlers/handler.interface';
import { assignmentHandler } from '../handlers/assignment.handler';
import { attendanceHandler } from '../handlers/attendance.handler';
import { examinationHandler } from '../handlers/examination.handler';
import { feesHandler } from '../handlers/fees.handler';
import { leaveHandler } from '../handlers/leave.handler';
import { noticeHandler } from '../handlers/notice.handler';
import { timetableHandler } from '../handlers/timetable.handler';
import { systemHandler } from '../handlers/system.handler';

export class NotificationEventService {
  private handlers: INotificationHandler[] = [];

  constructor(
    private readonly templateService: NotificationTemplateService = notificationTemplateService,
    private readonly preferenceService: NotificationPreferenceService = notificationPreferenceService,
    private readonly notificationRepo: NotificationRepository = notificationRepository,
    customHandlers?: INotificationHandler[]
  ) {
    this.handlers = customHandlers ?? [
      assignmentHandler,
      attendanceHandler,
      examinationHandler,
      feesHandler,
      leaveHandler,
      noticeHandler,
      timetableHandler,
      systemHandler,
    ];
  }

  public registerWithEventBus(): void {
    eventBus.subscribe('*', async (event: DomainEvent<any>) => {
      await this.processEvent(event);
    });
  }

  public async processEvent(event: DomainEvent<any>): Promise<number> {
    const config = NotificationRegistry.getConfig(event.eventType);
    const category = config?.category || NotificationCategory.SYSTEM;
    const priority = config?.priority || NotificationPriority.NORMAL;
    const isMandatory = config?.isMandatory ?? false;
    const defaultExpiresInDays = config?.defaultExpiresInDays || 90;

    // 1. Resolve targets from handlers
    let targets: ResolvedNotificationTarget[] = [];
    const handler = this.handlers.find((h) => h.canHandle(event.eventType));

    if (handler) {
      targets = await handler.resolveTargets(event);
    } else {
      // Generic fallback for custom/add-on events
      const payload = event.payload || {};
      if (payload.recipientId) {
        targets.push({
          recipientId: String(payload.recipientId),
          context: payload,
          metadata: { ...payload },
        });
      } else if (Array.isArray(payload.recipientIds)) {
        payload.recipientIds.forEach((rid: string) => {
          targets.push({
            recipientId: rid,
            context: payload,
            metadata: { ...payload },
          });
        });
      }
    }

    if (targets.length === 0) {
      return 0;
    }

    // 2. Extract recipient IDs and filter by preferences
    const allRecipientIds = targets.map((t) => t.recipientId);
    const eligibleRecipientIds = await this.preferenceService.filterEligibleRecipients(
      event.schoolId,
      allRecipientIds,
      event.eventType,
      isMandatory
    );

    const eligibleSet = new Set(eligibleRecipientIds);
    const filteredTargets = targets.filter((t) => eligibleSet.has(t.recipientId));

    if (filteredTargets.length === 0) {
      return 0;
    }

    // 3. Deduplicate targets (ensure unique recipientId per event processing)
    const uniqueTargetMap = new Map<string, ResolvedNotificationTarget>();
    for (const target of filteredTargets) {
      if (!uniqueTargetMap.has(target.recipientId)) {
        uniqueTargetMap.set(target.recipientId, target);
      }
    }
    const uniqueTargets = Array.from(uniqueTargetMap.values());

    // 4. Check existing notifications for idempotency (if entityId & entityType present)
    let existingRecipients = new Set<string>();
    if (event.entityId && event.entityType) {
      existingRecipients = await this.notificationRepo.findExistingRecipientIdsForEvent(
        event.schoolId,
        event.entityType,
        event.entityId,
        event.eventType
      );
    }

    const nonDuplicateTargets = uniqueTargets.filter(
      (t) => !existingRecipients.has(t.recipientId)
    );

    if (nonDuplicateTargets.length === 0) {
      return 0;
    }

    // 5. Build notifications array
    const now = new Date();
    const defaultExpiresAt = new Date(
      now.getTime() + defaultExpiresInDays * 24 * 60 * 60 * 1000
    );

    const notificationsToCreate: Prisma.NotificationCreateManyInput[] = [];

    for (const target of nonDuplicateTargets) {
      const rendered = await this.templateService.render(
        event.eventType,
        target.context,
        event.schoolId
      );

      const metadata: Record<string, unknown> = {
        eventId: event.eventId,
        ...target.metadata,
      };

      notificationsToCreate.push({
        schoolId: event.schoolId,
        recipientId: target.recipientId,
        type: event.eventType,
        category,
        title: rendered.title,
        body: rendered.body,
        entityType: event.entityType || null,
        entityId: event.entityId || null,
        metadata: metadata as Prisma.InputJsonValue,
        priority,
        isRead: false,
        expiresAt: target.expiresAt || defaultExpiresAt,
      });
    }

    // 6. Bulk Insert
    const createdCount = await this.notificationRepo.createManyInBatches(
      notificationsToCreate
    );

    return createdCount;
  }
}

export const notificationEventService = new NotificationEventService();
