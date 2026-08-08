import { LeaveType, LeavePriority, HalfType, LeaveStatus } from '@prisma/client';
import { createLeaveSchema, reviewLeaveSchema, cancelLeaveSchema } from '../validators/leave.validator';

describe('Leave Validators', () => {
  describe('createLeaveSchema', () => {
    it('should validate a valid full-day leave creation payload', () => {
      const validPayload = {
        body: {
          leaveType: LeaveType.CASUAL_LEAVE,
          reason: 'Going to family function',
          startDate: '2026-09-10T00:00:00Z',
          endDate: '2026-09-12T00:00:00Z',
          halfDay: false,
          priority: LeavePriority.NORMAL,
          attachment: 'https://example.com/document.pdf',
          remarks: 'Will check emails periodically',
          studentId: '550e8400-e29b-41d4-a716-446655440000'
        }
      };

      const result = createLeaveSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.leaveType).toBe(LeaveType.CASUAL_LEAVE);
        expect(result.data.body.halfDay).toBe(false);
        expect(result.data.body.priority).toBe(LeavePriority.NORMAL);
      }
    });

    it('should validate a valid half-day leave payload with halfType', () => {
      const validPayload = {
        body: {
          leaveType: LeaveType.SICK_LEAVE,
          reason: 'Doctor appointment in the morning',
          startDate: '2026-09-10T00:00:00Z',
          endDate: '2026-09-10T00:00:00Z',
          halfDay: true,
          halfType: HalfType.FIRST_HALF
        }
      };

      const result = createLeaveSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should fail validation if reason is less than 5 characters', () => {
      const invalidPayload = {
        body: {
          leaveType: LeaveType.CASUAL_LEAVE,
          reason: 'Sick',
          startDate: '2026-09-10T00:00:00Z',
          endDate: '2026-09-10T00:00:00Z'
        }
      };

      const result = createLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should fail validation if endDate is before startDate', () => {
      const invalidPayload = {
        body: {
          leaveType: LeaveType.CASUAL_LEAVE,
          reason: 'Vacation with family',
          startDate: '2026-09-15T00:00:00Z',
          endDate: '2026-09-10T00:00:00Z'
        }
      };

      const result = createLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const endDateError = result.error.issues.find(i => i.path.includes('endDate'));
        expect(endDateError?.message).toBe('End date must be greater than or equal to start date');
      }
    });

    it('should fail validation if halfDay is true but halfType is missing', () => {
      const invalidPayload = {
        body: {
          leaveType: LeaveType.CASUAL_LEAVE,
          reason: 'Dental appointment',
          startDate: '2026-09-10T00:00:00Z',
          endDate: '2026-09-10T00:00:00Z',
          halfDay: true
        }
      };

      const result = createLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const halfTypeError = result.error.issues.find(i => i.path.includes('halfType'));
        expect(halfTypeError?.message).toBe('halfType is required when halfDay is true');
      }
    });

    it('should fail validation for invalid attachment URL format', () => {
      const invalidPayload = {
        body: {
          leaveType: LeaveType.CASUAL_LEAVE,
          reason: 'Personal work',
          startDate: '2026-09-10T00:00:00Z',
          endDate: '2026-09-10T00:00:00Z',
          attachment: 'not-a-url'
        }
      };

      const result = createLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should fail validation for invalid studentId format', () => {
      const invalidPayload = {
        body: {
          leaveType: LeaveType.CASUAL_LEAVE,
          reason: 'Child is unwell',
          startDate: '2026-09-10T00:00:00Z',
          endDate: '2026-09-10T00:00:00Z',
          studentId: 'invalid-uuid-123'
        }
      };

      const result = createLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('reviewLeaveSchema', () => {
    it('should validate status APPROVED without adminRemarks', () => {
      const validPayload = {
        body: {
          status: LeaveStatus.APPROVED
        }
      };

      const result = reviewLeaveSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should validate status REJECTED with adminRemarks', () => {
      const validPayload = {
        body: {
          status: LeaveStatus.REJECTED,
          adminRemarks: 'Insufficient quota remaining for this month'
        }
      };

      const result = reviewLeaveSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should fail validation if status is REJECTED and adminRemarks is missing', () => {
      const invalidPayload = {
        body: {
          status: LeaveStatus.REJECTED
        }
      };

      const result = reviewLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const remarkError = result.error.issues.find(i => i.path.includes('adminRemarks'));
        expect(remarkError?.message).toBe('Admin remarks are mandatory when rejecting a leave request');
      }
    });

    it('should fail validation if status is invalid', () => {
      const invalidPayload = {
        body: {
          status: 'PENDING'
        }
      };

      const result = reviewLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('cancelLeaveSchema', () => {
    it('should validate a valid UUID param for cancel leave', () => {
      const validPayload = {
        params: {
          id: '550e8400-e29b-41d4-a716-446655440000'
        }
      };

      const result = cancelLeaveSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should fail validation for non-UUID param', () => {
      const invalidPayload = {
        params: {
          id: 'leave-123'
        }
      };

      const result = cancelLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
