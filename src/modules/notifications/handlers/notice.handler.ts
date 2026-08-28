import { Role } from '@prisma/client';
import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { NoticeEventPayload } from '../events/notification.events';
import { NotificationRecipientService, notificationRecipientService } from '../services/notification-recipient.service';
import { INotificationHandler, ResolvedNotificationTarget } from './handler.interface';

export class NoticeHandler implements INotificationHandler<NoticeEventPayload> {
  constructor(
    private readonly recipientService: NotificationRecipientService = notificationRecipientService
  ) {}

  public canHandle(eventType: string): boolean {
    return [
      NOTIFICATION_EVENT_TYPES.NOTICE_PUBLISHED,
      NOTIFICATION_EVENT_TYPES.CIRCULAR_PUBLISHED,
      NOTIFICATION_EVENT_TYPES.NOTICE_UPDATED,
      NOTIFICATION_EVENT_TYPES.NOTICE_EXPIRING,
    ].includes(eventType as any);
  }

  public async resolveTargets(
    event: DomainEvent<NoticeEventPayload>
  ): Promise<ResolvedNotificationTarget[]> {
    const { schoolId, payload } = event;
    const targets: ResolvedNotificationTarget[] = [];
    const baseMetadata = {
      noticeId: payload.noticeId,
      isCircular: payload.isCircular,
    };

    // 1. Target single student / parent
    if (payload.targetStudentId) {
      const parents = await this.recipientService.resolveParentsForSingleStudent(
        schoolId,
        payload.targetStudentId
      );

      parents.forEach((parent) => {
        targets.push({
          recipientId: parent.parentUserId,
          context: { ...payload, studentName: parent.studentName },
          metadata: { ...baseMetadata, studentId: payload.targetStudentId },
        });
      });

      return targets;
    }

    // 2. Target specific class/section
    if (payload.targetClassId) {
      const students = await this.recipientService.resolveStudentsInClass(
        schoolId,
        payload.targetClassId,
        payload.targetSectionId
      );

      const studentIds = students.map((s) => s.id);
      const parents = await this.recipientService.resolveParentsOfStudents(
        schoolId,
        studentIds
      );

      parents.forEach((parent) => {
        targets.push({
          recipientId: parent.parentUserId,
          context: { ...payload, studentName: parent.studentName },
          metadata: { ...baseMetadata, studentId: parent.studentId },
        });
      });

      return targets;
    }

    // 3. Target specific role or school-wide
    const rolesToTarget: Role[] = payload.targetRole
      ? [payload.targetRole as Role]
      : [Role.TEACHER, Role.PARENT, Role.SCHOOL_ADMIN];

    const userIds = await this.recipientService.resolveUsersByRoles(
      schoolId,
      rolesToTarget
    );

    userIds.forEach((userId) => {
      targets.push({
        recipientId: userId,
        context: { ...payload },
        metadata: baseMetadata,
      });
    });

    return targets;
  }
}

export const noticeHandler = new NoticeHandler();
