import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { assignmentHandler } from '../handlers/assignment.handler';
import { attendanceHandler } from '../handlers/attendance.handler';
import { examinationHandler } from '../handlers/examination.handler';
import { feesHandler } from '../handlers/fees.handler';
import { leaveHandler } from '../handlers/leave.handler';
import { noticeHandler } from '../handlers/notice.handler';
import { timetableHandler } from '../handlers/timetable.handler';
import { systemHandler } from '../handlers/system.handler';
import { NotificationRecipientService } from '../services/notification-recipient.service';
import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { Role } from '@prisma/client';

describe('Domain Notification Handlers', () => {
  let mockRecipientService: jest.Mocked<NotificationRecipientService>;

  beforeEach(() => {
    mockRecipientService = {
      resolveStudentsInClass: jest.fn().mockResolvedValue([{ id: 's-1', name: 'Alice' }]),
      resolveParentsOfStudents: jest.fn().mockResolvedValue([
        { parentUserId: 'p-1', parentName: 'John', studentId: 's-1', studentName: 'Alice' },
      ]),
      resolveParentsForSingleStudent: jest.fn().mockResolvedValue([
        { parentUserId: 'p-1', parentName: 'John', studentId: 's-1', studentName: 'Alice' },
      ]),
      resolveTeachersForClass: jest.fn().mockResolvedValue(['t-user-1']),
      resolveUsersByRoles: jest.fn().mockResolvedValue(['admin-user-1']),
      resolveTeacherUserId: jest.fn().mockResolvedValue('t-user-1'),
    } as unknown as jest.Mocked<NotificationRecipientService>;
  });

  describe('AssignmentHandler', () => {
    it('should correctly match assignment events and resolve class parents', async () => {
      const handler = new (assignmentHandler.constructor as any)(mockRecipientService);
      expect(handler.canHandle(NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED)).toBe(true);

      const event: DomainEvent<any> = {
        eventId: 'e-1',
        eventType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
        schoolId: 'school-1',
        entityType: 'ASSIGNMENT',
        entityId: 'a-1',
        payload: {
          assignmentId: 'a-1',
          title: 'Science Project',
          classId: 'c-1',
          teacherName: 'Mr. Davis',
        },
        occurredAt: new Date(),
      };

      const targets = await handler.resolveTargets(event);
      expect(targets).toHaveLength(1);
      expect(targets[0].recipientId).toBe('p-1');
      expect(targets[0].context.studentName).toBe('Alice');
    });
  });

  describe('AttendanceHandler', () => {
    it('should resolve parents for STUDENT_MARKED_ABSENT', async () => {
      const handler = new (attendanceHandler.constructor as any)(mockRecipientService);
      expect(handler.canHandle(NOTIFICATION_EVENT_TYPES.STUDENT_MARKED_ABSENT)).toBe(true);

      const event: DomainEvent<any> = {
        eventId: 'e-2',
        eventType: NOTIFICATION_EVENT_TYPES.STUDENT_MARKED_ABSENT,
        schoolId: 'school-1',
        entityType: 'ATTENDANCE',
        payload: { studentId: 's-1', date: '2026-08-19' },
        occurredAt: new Date(),
      };

      const targets = await handler.resolveTargets(event);
      expect(targets).toHaveLength(1);
      expect(targets[0].recipientId).toBe('p-1');
    });
  });

  describe('FeesHandler', () => {
    it('should resolve parents for FEE_ASSIGNED', async () => {
      const handler = new (feesHandler.constructor as any)(mockRecipientService);
      expect(handler.canHandle(NOTIFICATION_EVENT_TYPES.FEE_ASSIGNED)).toBe(true);

      const event: DomainEvent<any> = {
        eventId: 'e-3',
        eventType: NOTIFICATION_EVENT_TYPES.FEE_ASSIGNED,
        schoolId: 'school-1',
        entityType: 'FEE',
        payload: { studentId: 's-1', amount: 5000, feeTitle: 'Term 1 Tuition' },
        occurredAt: new Date(),
      };

      const targets = await handler.resolveTargets(event);
      expect(targets).toHaveLength(1);
      expect(targets[0].recipientId).toBe('p-1');
    });
  });

  describe('LeaveHandler', () => {
    it('should notify admins when leave is submitted', async () => {
      const handler = new (leaveHandler.constructor as any)(mockRecipientService);
      expect(handler.canHandle(NOTIFICATION_EVENT_TYPES.LEAVE_SUBMITTED)).toBe(true);

      const event: DomainEvent<any> = {
        eventId: 'e-4',
        eventType: NOTIFICATION_EVENT_TYPES.LEAVE_SUBMITTED,
        schoolId: 'school-1',
        entityType: 'LEAVE',
        payload: {
          leaveRequestId: 'lr-1',
          applicantId: 't-user-1',
          applicantName: 'Mr. Davis',
          applicantRole: 'TEACHER',
          leaveType: 'SICK',
          startDate: '2026-08-20',
          endDate: '2026-08-21',
        },
        occurredAt: new Date(),
      };

      const targets = await handler.resolveTargets(event);
      expect(targets).toHaveLength(1);
      expect(targets[0].recipientId).toBe('admin-user-1');
    });
  });

  describe('NoticeHandler', () => {
    it('should resolve target role when notice is published', async () => {
      const handler = new (noticeHandler.constructor as any)(mockRecipientService);
      expect(handler.canHandle(NOTIFICATION_EVENT_TYPES.NOTICE_PUBLISHED)).toBe(true);

      const event: DomainEvent<any> = {
        eventId: 'e-5',
        eventType: NOTIFICATION_EVENT_TYPES.NOTICE_PUBLISHED,
        schoolId: 'school-1',
        entityType: 'NOTICE',
        payload: {
          noticeId: 'n-1',
          title: 'Annual Day Celebration',
          targetRole: Role.PARENT,
        },
        occurredAt: new Date(),
      };

      const targets = await handler.resolveTargets(event);
      expect(targets).toHaveLength(1);
      expect(targets[0].recipientId).toBe('admin-user-1');
    });
  });

  describe('ExaminationHandler', () => {
    it('should match examination events and resolve class parents', async () => {
      const handler = new (examinationHandler.constructor as any)(mockRecipientService);
      expect(handler.canHandle(NOTIFICATION_EVENT_TYPES.EXAM_CREATED)).toBe(true);

      const event: DomainEvent<any> = {
        eventId: 'e-exam',
        eventType: NOTIFICATION_EVENT_TYPES.EXAM_CREATED,
        schoolId: 'school-1',
        entityType: 'EXAM',
        entityId: 'ex-1',
        payload: {
          examId: 'ex-1',
          examName: 'Midterm Exam',
          classId: 'c-1',
        },
        occurredAt: new Date(),
      };

      const targets = await handler.resolveTargets(event);
      expect(targets).toHaveLength(1);
      expect(targets[0].recipientId).toBe('p-1');
    });
  });

  describe('TimetableHandler', () => {
    it('should resolve parents and teachers for TIMETABLE_PUBLISHED', async () => {
      const handler = new (timetableHandler.constructor as any)(mockRecipientService);
      expect(handler.canHandle(NOTIFICATION_EVENT_TYPES.TIMETABLE_PUBLISHED)).toBe(true);

      const event: DomainEvent<any> = {
        eventId: 'e-6',
        eventType: NOTIFICATION_EVENT_TYPES.TIMETABLE_PUBLISHED,
        schoolId: 'school-1',
        entityType: 'TIMETABLE',
        payload: { classId: 'c-1', className: 'Class 10-A' },
        occurredAt: new Date(),
      };

      const targets = await handler.resolveTargets(event);
      expect(targets).toHaveLength(2); // 1 parent + 1 teacher
      expect(targets.map((t: any) => t.recipientId)).toEqual(
        expect.arrayContaining(['p-1', 't-user-1'])
      );
    });
  });

  describe('SystemHandler', () => {
    it('should resolve user for security alerts', async () => {
      const handler = new (systemHandler.constructor as any)(mockRecipientService);
      expect(handler.canHandle(NOTIFICATION_EVENT_TYPES.SECURITY_ALERT)).toBe(true);

      const event: DomainEvent<any> = {
        eventId: 'e-7',
        eventType: NOTIFICATION_EVENT_TYPES.SECURITY_ALERT,
        schoolId: 'school-1',
        entityType: 'SECURITY',
        payload: { userId: 'u-1', message: 'New login from unknown IP' },
        occurredAt: new Date(),
      };

      const targets = await handler.resolveTargets(event);
      expect(targets).toHaveLength(1);
      expect(targets[0].recipientId).toBe('u-1');
    });
  });
});
