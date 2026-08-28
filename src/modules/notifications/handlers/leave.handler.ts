import { Role } from '@prisma/client';
import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { LeaveEventPayload } from '../events/notification.events';
import { NotificationRecipientService, notificationRecipientService } from '../services/notification-recipient.service';
import { INotificationHandler, ResolvedNotificationTarget } from './handler.interface';

export class LeaveHandler implements INotificationHandler<LeaveEventPayload> {
  constructor(
    private readonly recipientService: NotificationRecipientService = notificationRecipientService
  ) {}

  public canHandle(eventType: string): boolean {
    return [
      NOTIFICATION_EVENT_TYPES.LEAVE_SUBMITTED,
      NOTIFICATION_EVENT_TYPES.LEAVE_APPROVED,
      NOTIFICATION_EVENT_TYPES.LEAVE_REJECTED,
      NOTIFICATION_EVENT_TYPES.LEAVE_CANCELLED,
      NOTIFICATION_EVENT_TYPES.LEAVE_WITHDRAWN,
    ].includes(eventType as any);
  }

  public async resolveTargets(
    event: DomainEvent<LeaveEventPayload>
  ): Promise<ResolvedNotificationTarget[]> {
    const { schoolId, eventType, payload } = event;
    const targets: ResolvedNotificationTarget[] = [];

    const baseMetadata = {
      leaveRequestId: payload.leaveRequestId,
      applicantId: payload.applicantId,
    };

    if (eventType === NOTIFICATION_EVENT_TYPES.LEAVE_SUBMITTED) {
      // Notify approvers (School Admins)
      const adminIds = await this.recipientService.resolveUsersByRoles(schoolId, [
        Role.SCHOOL_ADMIN,
        Role.SUPER_ADMIN,
      ]);

      adminIds.forEach((adminId) => {
        targets.push({
          recipientId: adminId,
          context: { ...payload },
          metadata: baseMetadata,
        });
      });

      return targets;
    }

    // For Approved/Rejected/Cancelled/Withdrawn -> Notify Applicant
    if (payload.applicantId) {
      targets.push({
        recipientId: payload.applicantId,
        context: { ...payload },
        metadata: baseMetadata,
      });
    }

    // If applicant was a student, also notify their parents
    if (payload.studentId) {
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
            ...baseMetadata,
            studentId: payload.studentId,
          },
        });
      });
    }

    return targets;
  }
}

export const leaveHandler = new LeaveHandler();
