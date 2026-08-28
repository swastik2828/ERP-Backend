import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { ExaminationEventPayload } from '../events/notification.events';
import { NotificationRecipientService, notificationRecipientService } from '../services/notification-recipient.service';
import { INotificationHandler, ResolvedNotificationTarget } from './handler.interface';

export class ExaminationHandler implements INotificationHandler<ExaminationEventPayload> {
  constructor(
    private readonly recipientService: NotificationRecipientService = notificationRecipientService
  ) {}

  public canHandle(eventType: string): boolean {
    return [
      NOTIFICATION_EVENT_TYPES.EXAM_CREATED,
      NOTIFICATION_EVENT_TYPES.EXAM_UPDATED,
      NOTIFICATION_EVENT_TYPES.EXAM_CANCELLED,
      NOTIFICATION_EVENT_TYPES.RESULT_PUBLISHED,
      NOTIFICATION_EVENT_TYPES.RESULT_UPDATED,
    ].includes(eventType as any);
  }

  public async resolveTargets(
    event: DomainEvent<ExaminationEventPayload>
  ): Promise<ResolvedNotificationTarget[]> {
    const { schoolId, payload } = event;
    const targets: ResolvedNotificationTarget[] = [];

    const baseMetadata = {
      examId: payload.examId,
      classId: payload.classId,
    };

    // If individual student result
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

      return targets;
    }

    // Class-wide exam announcement
    if (payload.classId) {
      const students = await this.recipientService.resolveStudentsInClass(
        schoolId,
        payload.classId
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
    }

    return targets;
  }
}

export const examinationHandler = new ExaminationHandler();
