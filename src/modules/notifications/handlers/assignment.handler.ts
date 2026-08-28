import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { AssignmentEventPayload } from '../events/notification.events';
import { NotificationRecipientService, notificationRecipientService } from '../services/notification-recipient.service';
import { INotificationHandler, ResolvedNotificationTarget } from './handler.interface';

export class AssignmentHandler implements INotificationHandler<AssignmentEventPayload> {
  constructor(
    private readonly recipientService: NotificationRecipientService = notificationRecipientService
  ) {}

  public canHandle(eventType: string): boolean {
    return [
      NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
      NOTIFICATION_EVENT_TYPES.ASSIGNMENT_UPDATED,
      NOTIFICATION_EVENT_TYPES.ASSIGNMENT_DUE_SOON,
      NOTIFICATION_EVENT_TYPES.ASSIGNMENT_GRADED,
    ].includes(eventType as any);
  }

  public async resolveTargets(
    event: DomainEvent<AssignmentEventPayload>
  ): Promise<ResolvedNotificationTarget[]> {
    const { schoolId, eventType, payload } = event;
    const targets: ResolvedNotificationTarget[] = [];

    const baseMetadata = {
      assignmentId: payload.assignmentId,
      classId: payload.classId,
      sectionId: payload.sectionId,
    };

    if (eventType === NOTIFICATION_EVENT_TYPES.ASSIGNMENT_GRADED && payload.studentId) {
      // Individual graded assignment notification for specific student's parents
      const parents = await this.recipientService.resolveParentsForSingleStudent(
        schoolId,
        payload.studentId
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
            studentId: payload.studentId,
          },
        });
      });

      return targets;
    }

    // Class/Section-wide assignment notification
    if (payload.classId) {
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

      // Add parent notifications
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

export const assignmentHandler = new AssignmentHandler();
