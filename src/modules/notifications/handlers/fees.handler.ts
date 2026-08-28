import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { FeeEventPayload } from '../events/notification.events';
import { NotificationRecipientService, notificationRecipientService } from '../services/notification-recipient.service';
import { INotificationHandler, ResolvedNotificationTarget } from './handler.interface';

export class FeesHandler implements INotificationHandler<FeeEventPayload> {
  constructor(
    private readonly recipientService: NotificationRecipientService = notificationRecipientService
  ) {}

  public canHandle(eventType: string): boolean {
    return [
      NOTIFICATION_EVENT_TYPES.FEE_ASSIGNED,
      NOTIFICATION_EVENT_TYPES.FEE_DUE_SOON,
      NOTIFICATION_EVENT_TYPES.FEE_OVERDUE,
      NOTIFICATION_EVENT_TYPES.PAYMENT_RECEIVED,
      NOTIFICATION_EVENT_TYPES.PAYMENT_FAILED,
      NOTIFICATION_EVENT_TYPES.REFUND_PROCESSED,
    ].includes(eventType as any);
  }

  public async resolveTargets(
    event: DomainEvent<FeeEventPayload>
  ): Promise<ResolvedNotificationTarget[]> {
    const { schoolId, payload } = event;
    const targets: ResolvedNotificationTarget[] = [];

    if (!payload.studentId) {
      return targets;
    }

    const parents = await this.recipientService.resolveParentsForSingleStudent(
      schoolId,
      payload.studentId
    );

    parents.forEach((parent) => {
      targets.push({
        recipientId: parent.parentUserId,
        context: {
          ...payload,
          studentName: payload.studentName || parent.studentName,
          parentName: parent.parentName,
        },
        metadata: {
          feeStructureId: payload.feeStructureId,
          studentId: payload.studentId,
          paymentId: payload.paymentId,
          transactionNumber: payload.transactionNumber,
        },
      });
    });

    return targets;
  }
}

export const feesHandler = new FeesHandler();
