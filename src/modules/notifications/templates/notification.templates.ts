import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';

export interface TemplateDefinition {
  titleTemplate: string;
  bodyTemplate: string;
}

export const DEFAULT_TEMPLATES: Record<string, TemplateDefinition> = {
  // Academic
  [NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED]: {
    titleTemplate: 'New Assignment: {{title}}',
    bodyTemplate: '{{teacherName}} published a new {{subjectName}} assignment for {{className}}. Due on {{dueDate}}.',
  },
  [NOTIFICATION_EVENT_TYPES.ASSIGNMENT_UPDATED]: {
    titleTemplate: 'Assignment Updated: {{title}}',
    bodyTemplate: 'The {{subjectName}} assignment "{{title}}" for {{className}} has been updated.',
  },
  [NOTIFICATION_EVENT_TYPES.ASSIGNMENT_DUE_SOON]: {
    titleTemplate: 'Assignment Due Soon: {{title}}',
    bodyTemplate: 'Reminder: The {{subjectName}} assignment "{{title}}" is due on {{dueDate}}.',
  },
  [NOTIFICATION_EVENT_TYPES.ASSIGNMENT_GRADED]: {
    titleTemplate: 'Assignment Graded: {{title}}',
    bodyTemplate: 'Your assignment "{{title}}" for {{subjectName}} has been graded. Score: {{score}}/{{maxScore}}.',
  },
  [NOTIFICATION_EVENT_TYPES.EXAM_CREATED]: {
    titleTemplate: 'New Exam Scheduled: {{examName}}',
    bodyTemplate: 'A new exam "{{examName}}" has been scheduled for {{className}} starting on {{examDate}}.',
  },
  [NOTIFICATION_EVENT_TYPES.EXAM_UPDATED]: {
    titleTemplate: 'Exam Schedule Updated: {{examName}}',
    bodyTemplate: 'The schedule for exam "{{examName}}" has been updated. Please review the timetable.',
  },
  [NOTIFICATION_EVENT_TYPES.EXAM_CANCELLED]: {
    titleTemplate: 'Exam Cancelled: {{examName}}',
    bodyTemplate: 'The exam "{{examName}}" scheduled for {{className}} has been cancelled.',
  },
  [NOTIFICATION_EVENT_TYPES.RESULT_PUBLISHED]: {
    titleTemplate: 'Results Published: {{examName}}',
    bodyTemplate: 'Results for {{examName}} are now available. Check your academic report card.',
  },
  [NOTIFICATION_EVENT_TYPES.RESULT_UPDATED]: {
    titleTemplate: 'Results Updated: {{examName}}',
    bodyTemplate: 'The results for {{examName}} have been revised. Please check your updated marks.',
  },

  // Attendance
  [NOTIFICATION_EVENT_TYPES.STUDENT_MARKED_ABSENT]: {
    titleTemplate: 'Attendance Alert: {{studentName}} Absent',
    bodyTemplate: '{{studentName}} was marked absent on {{date}}. Please contact the school if this is an error.',
  },
  [NOTIFICATION_EVENT_TYPES.ATTENDANCE_CORRECTION_APPROVED]: {
    titleTemplate: 'Attendance Correction Approved',
    bodyTemplate: 'Attendance correction request for {{studentName}} on {{date}} has been approved.',
  },
  [NOTIFICATION_EVENT_TYPES.ATTENDANCE_CORRECTION_REJECTED]: {
    titleTemplate: 'Attendance Correction Rejected',
    bodyTemplate: 'Attendance correction request for {{studentName}} on {{date}} was rejected. Reason: {{reason}}.',
  },
  [NOTIFICATION_EVENT_TYPES.TEACHER_MARKED_ABSENT]: {
    titleTemplate: 'Teacher Absence Notification',
    bodyTemplate: 'Teacher {{teacherName}} is marked absent on {{date}}.',
  },

  // Fees
  [NOTIFICATION_EVENT_TYPES.FEE_ASSIGNED]: {
    titleTemplate: 'New Fee Assigned: {{feeTitle}}',
    bodyTemplate: 'A fee of ₹{{amount}} for {{feeTitle}} has been assigned. Due date: {{dueDate}}.',
  },
  [NOTIFICATION_EVENT_TYPES.FEE_DUE_SOON]: {
    titleTemplate: 'Fee Reminder: {{feeTitle}} Due Soon',
    bodyTemplate: 'Reminder: Fee payment of ₹{{amount}} for {{feeTitle}} is due on {{dueDate}}.',
  },
  [NOTIFICATION_EVENT_TYPES.FEE_OVERDUE]: {
    titleTemplate: 'Fee Overdue Alert: {{feeTitle}}',
    bodyTemplate: 'The fee payment of ₹{{amount}} for {{feeTitle}} is overdue. Please pay promptly.',
  },
  [NOTIFICATION_EVENT_TYPES.PAYMENT_RECEIVED]: {
    titleTemplate: 'Payment Received: ₹{{paidAmount}}',
    bodyTemplate: 'Payment of ₹{{paidAmount}} for {{feeTitle}} has been received. Receipt #{{transactionNumber}}.',
  },
  [NOTIFICATION_EVENT_TYPES.PAYMENT_FAILED]: {
    titleTemplate: 'Payment Failed: {{feeTitle}}',
    bodyTemplate: 'The transaction for {{feeTitle}} (₹{{amount}}) could not be processed. Please retry.',
  },
  [NOTIFICATION_EVENT_TYPES.REFUND_PROCESSED]: {
    titleTemplate: 'Refund Processed: ₹{{refundAmount}}',
    bodyTemplate: 'A refund of ₹{{refundAmount}} has been processed for {{feeTitle}}.',
  },

  // Leave
  [NOTIFICATION_EVENT_TYPES.LEAVE_SUBMITTED]: {
    titleTemplate: 'Leave Application Submitted: {{applicantName}}',
    bodyTemplate: '{{applicantName}} ({{applicantRole}}) has submitted a {{leaveType}} leave request from {{startDate}} to {{endDate}}.',
  },
  [NOTIFICATION_EVENT_TYPES.LEAVE_APPROVED]: {
    titleTemplate: 'Leave Approved',
    bodyTemplate: 'Your {{leaveType}} leave application from {{startDate}} to {{endDate}} has been approved by {{approverName}}.',
  },
  [NOTIFICATION_EVENT_TYPES.LEAVE_REJECTED]: {
    titleTemplate: 'Leave Rejected',
    bodyTemplate: 'Your {{leaveType}} leave application was rejected. Reason: {{rejectionReason}}.',
  },
  [NOTIFICATION_EVENT_TYPES.LEAVE_CANCELLED]: {
    titleTemplate: 'Leave Cancelled',
    bodyTemplate: 'The leave request from {{startDate}} to {{endDate}} has been cancelled.',
  },
  [NOTIFICATION_EVENT_TYPES.LEAVE_WITHDRAWN]: {
    titleTemplate: 'Leave Application Withdrawn',
    bodyTemplate: '{{applicantName}} has withdrawn their leave request for {{startDate}} to {{endDate}}.',
  },

  // Notices
  [NOTIFICATION_EVENT_TYPES.NOTICE_PUBLISHED]: {
    titleTemplate: 'Notice: {{title}}',
    bodyTemplate: 'A new notice "{{title}}" has been published by {{publisherName}}.',
  },
  [NOTIFICATION_EVENT_TYPES.CIRCULAR_PUBLISHED]: {
    titleTemplate: 'Official Circular: {{title}}',
    bodyTemplate: 'An official school circular "{{title}}" has been released.',
  },
  [NOTIFICATION_EVENT_TYPES.NOTICE_UPDATED]: {
    titleTemplate: 'Notice Updated: {{title}}',
    bodyTemplate: 'The notice "{{title}}" has been updated. Please check the details.',
  },
  [NOTIFICATION_EVENT_TYPES.NOTICE_EXPIRING]: {
    titleTemplate: 'Notice Expiring Soon: {{title}}',
    bodyTemplate: 'The notice "{{title}}" will expire soon.',
  },

  // Timetable
  [NOTIFICATION_EVENT_TYPES.TIMETABLE_PUBLISHED]: {
    titleTemplate: 'Timetable Published: {{className}}',
    bodyTemplate: 'The updated class timetable for {{className}} is now available.',
  },
  [NOTIFICATION_EVENT_TYPES.TIMETABLE_UPDATED]: {
    titleTemplate: 'Timetable Updated: {{className}}',
    bodyTemplate: 'Changes have been made to the timetable for {{className}}.',
  },
  [NOTIFICATION_EVENT_TYPES.CLASS_CANCELLED]: {
    titleTemplate: 'Class Cancelled: {{subjectName}}',
    bodyTemplate: 'The {{subjectName}} class on {{date}} for {{className}} has been cancelled. Reason: {{reason}}.',
  },

  // System & Security
  [NOTIFICATION_EVENT_TYPES.ACCOUNT_CREATED]: {
    titleTemplate: 'Welcome to School ERP',
    bodyTemplate: 'Your account has been successfully created. Welcome aboard!',
  },
  [NOTIFICATION_EVENT_TYPES.PASSWORD_CHANGED]: {
    titleTemplate: 'Security Alert: Password Changed',
    bodyTemplate: 'The password for your account was changed recently. If you did not make this change, please contact administration immediately.',
  },
  [NOTIFICATION_EVENT_TYPES.SECURITY_ALERT]: {
    titleTemplate: 'Security Alert: {{alertType}}',
    bodyTemplate: '{{message}}',
  },
  [NOTIFICATION_EVENT_TYPES.SYSTEM_ANNOUNCEMENT]: {
    titleTemplate: 'System Announcement: {{title}}',
    bodyTemplate: '{{message}}',
  },
};

/**
 * Safely renders a template string with placeholders in the form `{{variableName}}`.
 * Prevents code execution and handles missing variables gracefully.
 */
export function renderTemplate(
  templateString: string,
  context: Record<string, unknown>
): string {
  if (!templateString) return '';

  return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const value = context[key];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
}
