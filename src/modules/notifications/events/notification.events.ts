import { DomainEvent } from '../../../infrastructure/events/event.interface';

export interface AssignmentEventPayload {
  assignmentId: string;
  title: string;
  subjectName: string;
  className: string;
  sectionName?: string;
  classId: string;
  sectionId?: string;
  teacherId: string;
  teacherName: string;
  dueDate?: string;
  maxScore?: number;
  score?: number;
  grade?: string;
  studentId?: string; // Present for graded/individual events
  studentName?: string;
  parentName?: string;
}

export interface AttendanceEventPayload {
  studentId?: string;
  studentName?: string;
  parentName?: string;
  teacherId?: string;
  teacherName?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  date: string;
  status: string;
  reason?: string;
  requestId?: string;
}

export interface ExaminationEventPayload {
  examId: string;
  examName: string;
  className?: string;
  classId?: string;
  subjectName?: string;
  examDate?: string;
  startTime?: string;
  endTime?: string;
  studentId?: string;
  studentName?: string;
  parentName?: string;
  totalMarks?: number;
  percentage?: number;
  grade?: string;
}

export interface FeeEventPayload {
  feeStructureId?: string;
  feeTitle: string;
  amount: number;
  dueDate?: string;
  studentId: string;
  studentName?: string;
  parentName?: string;
  className?: string;
  paymentId?: string;
  transactionNumber?: string;
  paidAmount?: number;
  paymentDate?: string;
  refundAmount?: number;
  reason?: string;
}

export interface LeaveEventPayload {
  leaveRequestId: string;
  applicantId: string;
  applicantName: string;
  applicantRole: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  approverId?: string;
  approverName?: string;
  rejectionReason?: string;
  studentId?: string;
  studentName?: string;
  parentName?: string;
}

export interface NoticeEventPayload {
  noticeId: string;
  title: string;
  categoryName?: string;
  priority?: string;
  publisherName: string;
  targetRole?: string;
  targetClassId?: string;
  targetSectionId?: string;
  targetStudentId?: string;
  isCircular?: boolean;
}

export interface TimetableEventPayload {
  timetableId?: string;
  className: string;
  sectionName?: string;
  classId: string;
  sectionId?: string;
  subjectName?: string;
  teacherName?: string;
  periodNumber?: number;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: string;
  date?: string;
  reason?: string;
}

export interface SystemEventPayload {
  userId: string;
  userName?: string;
  email?: string;
  alertType?: string;
  message?: string;
  title?: string;
  ipAddress?: string;
  device?: string;
  timestamp?: string;
}

export type TypedNotificationEvent =
  | DomainEvent<AssignmentEventPayload>
  | DomainEvent<AttendanceEventPayload>
  | DomainEvent<ExaminationEventPayload>
  | DomainEvent<FeeEventPayload>
  | DomainEvent<LeaveEventPayload>
  | DomainEvent<NoticeEventPayload>
  | DomainEvent<TimetableEventPayload>
  | DomainEvent<SystemEventPayload>
  | DomainEvent<Record<string, unknown>>;
