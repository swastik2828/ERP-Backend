import { LeaveType, LeavePriority, HalfType, LeaveStatus } from '@prisma/client';

export interface CreateLeaveDto {
  leaveType: LeaveType;
  reason: string;
  startDate: string; // ISO Date string
  endDate: string; // ISO Date string
  halfDay?: boolean;
  halfType?: HalfType;
  priority?: LeavePriority;
  attachment?: string;
  remarks?: string;
  studentId?: string; // Required if parent is applying
}

export interface ReviewLeaveDto {
  status: typeof LeaveStatus.APPROVED | typeof LeaveStatus.REJECTED;
  adminRemarks?: string;
}

export interface LeaveQueryFilters {
  page?: number;
  limit?: number;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  priority?: LeavePriority;
  startDate?: string;
  endDate?: string;
}