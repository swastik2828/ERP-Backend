import { Role } from '@prisma/client';
import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { AttendanceEventPayload } from '../events/notification.events';
import { NotificationRecipientService, notificationRecipientService } from '../services/notification-recipient.service';
import { INotificationHandler, ResolvedNotificationTarget } from './handler.interface';

export class AttendanceHandler implements INotificationHandler<AttendanceEventPayload> {
  constructor(
    private readonly recipientService: NotificationRecipientService = notificationRecipientService
  ) {}

  public canHandle(eventType: string): boolean {
    return [
      NOTIFICATION_EVENT_TYPES.STUDENT_MARKED_ABSENT,
      NOTIFICATION_EVENT_TYPES.ATTENDANCE_CORRECTION_APPROVED,
      NOTIFICATION_EVENT_TYPES.ATTENDANCE_CORRECTION_REJECTED,
      NOTIFICATION_EVENT_TYPES.TEACHER_MARKED_ABSENT,
    ].includes(eventType as any);
  }

  public async resolveTargets(
    event: DomainEvent<AttendanceEventPayload>
  ): Promise<ResolvedNotificationTarget[]> {
    const { schoolId, eventType, payload } = event;
    const targets: ResolvedNotificationTarget[] = [];

    if (eventType === NOTIFICATION_EVENT_TYPES.TEACHER_MARKED_ABSENT) {
      // Notify school admins about teacher absence
      const adminUserIds = await this.recipientService.resolveUsersByRoles(
        schoolId,
        [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN]
      );

      adminUserIds.forEach((adminId) => {
        targets.push({
          recipientId: adminId,
          context: {
            ...payload,
          },
          metadata: {
            teacherId: payload.teacherId,
            date: payload.date,
          },
        });
      });

      return targets;
    }

    // Student attendance events -> notify parents
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
            studentId: payload.studentId,
            date: payload.date,
            requestId: payload.requestId,
          },
        });
      });
    }

    return targets;
  }
}

export const attendanceHandler = new AttendanceHandler();
