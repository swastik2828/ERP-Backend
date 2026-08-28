import { NotificationCategory, NotificationPriority } from '@prisma/client';
import { NOTIFICATION_EVENT_TYPES, NotificationEventType } from '../constants/notification.constants';
import { DEFAULT_TEMPLATES, TemplateDefinition } from '../templates/notification.templates';

export interface EventMetadataConfig {
  eventType: NotificationEventType;
  category: NotificationCategory;
  priority: NotificationPriority;
  isMandatory: boolean;
  defaultExpiresInDays?: number;
  defaultTemplate: TemplateDefinition;
  description: string;
}

export class NotificationRegistry {
  private static registry: Map<string, EventMetadataConfig> = new Map();

  static {
    NotificationRegistry.registerDefaults();
  }

  private static registerDefaults(): void {
    // Academic Events
    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
      category: NotificationCategory.ACADEMIC,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 60,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED],
      description: 'Triggered when a teacher publishes a new assignment.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_UPDATED,
      category: NotificationCategory.ACADEMIC,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 60,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.ASSIGNMENT_UPDATED],
      description: 'Triggered when an assignment details or due date are updated.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_DUE_SOON,
      category: NotificationCategory.ACADEMIC,
      priority: NotificationPriority.HIGH,
      isMandatory: false,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.ASSIGNMENT_DUE_SOON],
      description: 'Triggered when an assignment deadline is approaching.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_GRADED,
      category: NotificationCategory.ACADEMIC,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 90,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.ASSIGNMENT_GRADED],
      description: 'Triggered when teacher grades a student submission.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.EXAM_CREATED,
      category: NotificationCategory.ACADEMIC,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 90,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.EXAM_CREATED],
      description: 'Triggered when a new exam is scheduled.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.EXAM_UPDATED,
      category: NotificationCategory.ACADEMIC,
      priority: NotificationPriority.HIGH,
      isMandatory: false,
      defaultExpiresInDays: 90,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.EXAM_UPDATED],
      description: 'Triggered when an exam schedule is updated.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.EXAM_CANCELLED,
      category: NotificationCategory.ACADEMIC,
      priority: NotificationPriority.HIGH,
      isMandatory: true,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.EXAM_CANCELLED],
      description: 'Triggered when an exam is cancelled.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.RESULT_PUBLISHED,
      category: NotificationCategory.ACADEMIC,
      priority: NotificationPriority.HIGH,
      isMandatory: false,
      defaultExpiresInDays: 180,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.RESULT_PUBLISHED],
      description: 'Triggered when exam results are published.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.RESULT_UPDATED,
      category: NotificationCategory.ACADEMIC,
      priority: NotificationPriority.HIGH,
      isMandatory: false,
      defaultExpiresInDays: 180,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.RESULT_UPDATED],
      description: 'Triggered when exam results are revised.',
    });

    // Attendance Events
    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.STUDENT_MARKED_ABSENT,
      category: NotificationCategory.ATTENDANCE,
      priority: NotificationPriority.HIGH,
      isMandatory: true,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.STUDENT_MARKED_ABSENT],
      description: 'Triggered when a student is marked absent.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.ATTENDANCE_CORRECTION_APPROVED,
      category: NotificationCategory.ATTENDANCE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.ATTENDANCE_CORRECTION_APPROVED],
      description: 'Triggered when an attendance correction request is approved.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.ATTENDANCE_CORRECTION_REJECTED,
      category: NotificationCategory.ATTENDANCE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.ATTENDANCE_CORRECTION_REJECTED],
      description: 'Triggered when an attendance correction request is rejected.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.TEACHER_MARKED_ABSENT,
      category: NotificationCategory.ATTENDANCE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 14,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.TEACHER_MARKED_ABSENT],
      description: 'Triggered when a teacher is marked absent.',
    });

    // Fee Events
    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.FEE_ASSIGNED,
      category: NotificationCategory.FEES,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 90,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.FEE_ASSIGNED],
      description: 'Triggered when a fee is assigned to a student.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.FEE_DUE_SOON,
      category: NotificationCategory.FEES,
      priority: NotificationPriority.HIGH,
      isMandatory: false,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.FEE_DUE_SOON],
      description: 'Triggered when fee due date is approaching.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.FEE_OVERDUE,
      category: NotificationCategory.FEES,
      priority: NotificationPriority.HIGH,
      isMandatory: true,
      defaultExpiresInDays: 60,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.FEE_OVERDUE],
      description: 'Triggered when fee payment becomes overdue.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.PAYMENT_RECEIVED,
      category: NotificationCategory.FEES,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 180,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.PAYMENT_RECEIVED],
      description: 'Triggered when a fee payment is successfully processed.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.PAYMENT_FAILED,
      category: NotificationCategory.FEES,
      priority: NotificationPriority.HIGH,
      isMandatory: true,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.PAYMENT_FAILED],
      description: 'Triggered when a fee payment transaction fails.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.REFUND_PROCESSED,
      category: NotificationCategory.FEES,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 90,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.REFUND_PROCESSED],
      description: 'Triggered when a fee refund is processed.',
    });

    // Leave Events
    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.LEAVE_SUBMITTED,
      category: NotificationCategory.LEAVE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.LEAVE_SUBMITTED],
      description: 'Triggered when a leave request is submitted.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.LEAVE_APPROVED,
      category: NotificationCategory.LEAVE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.LEAVE_APPROVED],
      description: 'Triggered when a leave request is approved.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.LEAVE_REJECTED,
      category: NotificationCategory.LEAVE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.LEAVE_REJECTED],
      description: 'Triggered when a leave request is rejected.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.LEAVE_CANCELLED,
      category: NotificationCategory.LEAVE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.LEAVE_CANCELLED],
      description: 'Triggered when a leave request is cancelled.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.LEAVE_WITHDRAWN,
      category: NotificationCategory.LEAVE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.LEAVE_WITHDRAWN],
      description: 'Triggered when an applicant withdraws their leave request.',
    });

    // Notice Events
    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.NOTICE_PUBLISHED,
      category: NotificationCategory.NOTICE,
      priority: NotificationPriority.HIGH,
      isMandatory: false,
      defaultExpiresInDays: 60,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.NOTICE_PUBLISHED],
      description: 'Triggered when a general notice is published.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.CIRCULAR_PUBLISHED,
      category: NotificationCategory.NOTICE,
      priority: NotificationPriority.HIGH,
      isMandatory: true,
      defaultExpiresInDays: 120,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.CIRCULAR_PUBLISHED],
      description: 'Triggered when an official circular is published.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.NOTICE_UPDATED,
      category: NotificationCategory.NOTICE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 60,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.NOTICE_UPDATED],
      description: 'Triggered when a notice content is updated.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.NOTICE_EXPIRING,
      category: NotificationCategory.NOTICE,
      priority: NotificationPriority.LOW,
      isMandatory: false,
      defaultExpiresInDays: 7,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.NOTICE_EXPIRING],
      description: 'Triggered when a notice is nearing expiration.',
    });

    // Timetable Events
    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.TIMETABLE_PUBLISHED,
      category: NotificationCategory.TIMETABLE,
      priority: NotificationPriority.NORMAL,
      isMandatory: false,
      defaultExpiresInDays: 180,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.TIMETABLE_PUBLISHED],
      description: 'Triggered when a timetable is published.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.TIMETABLE_UPDATED,
      category: NotificationCategory.TIMETABLE,
      priority: NotificationPriority.HIGH,
      isMandatory: false,
      defaultExpiresInDays: 60,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.TIMETABLE_UPDATED],
      description: 'Triggered when a timetable schedule is changed.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.CLASS_CANCELLED,
      category: NotificationCategory.TIMETABLE,
      priority: NotificationPriority.HIGH,
      isMandatory: true,
      defaultExpiresInDays: 14,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.CLASS_CANCELLED],
      description: 'Triggered when a scheduled class period is cancelled.',
    });

    // System & Security Events
    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.ACCOUNT_CREATED,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.NORMAL,
      isMandatory: true,
      defaultExpiresInDays: 90,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.ACCOUNT_CREATED],
      description: 'Triggered when a new user account is created.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.PASSWORD_CHANGED,
      category: NotificationCategory.SECURITY,
      priority: NotificationPriority.HIGH,
      isMandatory: true,
      defaultExpiresInDays: 60,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.PASSWORD_CHANGED],
      description: 'Triggered when a user password is changed.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.SECURITY_ALERT,
      category: NotificationCategory.SECURITY,
      priority: NotificationPriority.URGENT,
      isMandatory: true,
      defaultExpiresInDays: 90,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.SECURITY_ALERT],
      description: 'Triggered on critical security warnings.',
    });

    NotificationRegistry.register({
      eventType: NOTIFICATION_EVENT_TYPES.SYSTEM_ANNOUNCEMENT,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.HIGH,
      isMandatory: true,
      defaultExpiresInDays: 30,
      defaultTemplate: DEFAULT_TEMPLATES[NOTIFICATION_EVENT_TYPES.SYSTEM_ANNOUNCEMENT],
      description: 'Broadcast system administrative message.',
    });
  }

  public static register(config: EventMetadataConfig): void {
    NotificationRegistry.registry.set(config.eventType, config);
  }

  public static getConfig(eventType: string): EventMetadataConfig | undefined {
    return NotificationRegistry.registry.get(eventType);
  }

  public static getAll(): EventMetadataConfig[] {
    return Array.from(NotificationRegistry.registry.values());
  }

  public static isMandatory(eventType: string): boolean {
    const config = NotificationRegistry.registry.get(eventType);
    return config ? config.isMandatory : false;
  }
}
