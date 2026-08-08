import { z } from 'zod';
import { LeaveType, LeavePriority, HalfType, LeaveStatus } from '@prisma/client';

export const createLeaveSchema = z.object({
  body: z.object({
    leaveType: z.nativeEnum(LeaveType, { message: 'Leave type is required' }),
    reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason too long'),
    startDate: z.string().datetime({ message: 'Invalid start date format' }),
    endDate: z.string().datetime({ message: 'Invalid end date format' }),
    halfDay: z.boolean().optional().default(false),
    halfType: z.nativeEnum(HalfType).optional(),
    priority: z.nativeEnum(LeavePriority).optional().default(LeavePriority.NORMAL),
    attachment: z.string().url('Attachment must be a valid URL').optional(),
    remarks: z.string().max(255).optional(),
    studentId: z.string().uuid('Invalid student ID').optional()
  }).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  }, {
    message: "End date must be greater than or equal to start date",
    path: ["endDate"]
  }).refine((data) => {
    if (data.halfDay && !data.halfType) {
      return false;
    }
    return true;
  }, {
    message: "halfType is required when halfDay is true",
    path: ["halfType"]
  })
});

export const reviewLeaveSchema = z.object({
  body: z.object({
    status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED], {
      message: 'Status must be APPROVED or REJECTED'
    }),
    adminRemarks: z.string().min(2, 'Admin remarks are required for rejection').max(500).optional()
  }).refine((data) => {
    if (data.status === LeaveStatus.REJECTED && !data.adminRemarks) {
      return false;
    }
    return true;
  }, {
    message: "Admin remarks are mandatory when rejecting a leave request",
    path: ["adminRemarks"]
  })
});

export const cancelLeaveSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid leave request ID')
  })
});