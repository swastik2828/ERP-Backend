import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { TimetableEventPayload } from '../events/notification.events';
import { NotificationRecipientService, notificationRecipientService } from '../services/notification-recipient.service';
import { INotificationHandler, ResolvedNotificationTarget } from './handler.interface';

export class TimetableHandler implements INotificationHandler<TimetableEventPayload> {
  constructor(
    private readonly recipientService: NotificationRecipientService = notificationRecipientService
  ) {}

  public canHandle(eventType: string): boolean {
    return [
      NOTIFICATION_EVENT_TYPES.TIMETABLE_PUBLISHED,
      NOTIFICATION_EVENT_TYPES.TIMETABLE_UPDATED,
      NOTIFICATION_EVENT_TYPES.CLASS_CANCELLED,
    ].includes(eventType as any);
  }

  public async resolveTargets(
    event: DomainEvent<TimetableEventPayload>
  ): Promise<ResolvedNotificationTarget[]> {
    const { schoolId, payload } = event;
    const targets: ResolvedNotificationTarget[] = [];
    const baseMetadata = {
      timetableId: payload.timetableId,
      classId: payload.classId,
      sectionId: payload.sectionId,
    };

    if (payload.classId) {
      // 1. Resolve students and parents
      const students = await this.recipientService.resolveStudentsInClass(
        schoolId,
        payload.classId,
        payload.sectionId
      );

      const studentIds = students.map((s) => s.id);
      const parents = await this.recipientService.resolveParentsOfStudents(
        schoolId,
        studentIds
      );

      parents.forEach((parent) => {
        targets.push({
          recipientId: parent.parentUserId,
          context: {
            ...payload,
            studentName: parent.studentName,
            parentName: parent.parentName,
          },
          metadata: {
            ...baseMetadata,
            studentId: parent.studentId,
          },
        });
      });

      // 2. Resolve teachers for this class
      const teacherUserIds = await this.recipientService.resolveTeachersForClass(
        schoolId,
        payload.classId,
        payload.sectionId
      );

      teacherUserIds.forEach((tUserId) => {
        targets.push({
          recipientId: tUserId,
          context: { ...payload },
          metadata: baseMetadata,
        });
      });
    }

    return targets;
  }
}

export const timetableHandler = new TimetableHandler();
