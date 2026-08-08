import { LeaveService } from '../services/leave.service';
import { LeaveRepository } from '../repositories/leave.repository';
import { AppError } from '../../../errors/AppError';
import { LeaveStatus, LeaveApplicantType, LeaveType, HalfType, LeavePriority } from '@prisma/client';
import { CreateLeaveDto, ReviewLeaveDto } from '../dtos/leave.dto';

jest.mock('../repositories/leave.repository');

describe('LeaveService', () => {
  let leaveService: LeaveService;

  beforeEach(() => {
    jest.clearAllMocks();
    leaveService = new LeaveService();
  });

  describe('submitLeave', () => {
    const schoolId = 'school-123';
    const submitterId = 'user-123';
    const applicantId = 'user-123';
    const applicantType = LeaveApplicantType.TEACHER;

    it('should successfully submit a full-day leave request when no overlaps exist', async () => {
      const dto: CreateLeaveDto = {
        leaveType: LeaveType.CASUAL_LEAVE,
        reason: 'Personal work at hometown',
        startDate: '2026-09-10T00:00:00Z',
        endDate: '2026-09-12T00:00:00Z',
        halfDay: false,
        priority: LeavePriority.NORMAL
      };

      (LeaveRepository.prototype.findOverlappingLeaves as jest.Mock).mockResolvedValue([]);
      
      const mockCreatedLeave = {
        id: 'leave-123',
        schoolId,
        applicantType,
        applicantId,
        submittedBy: submitterId,
        totalDays: 3,
        status: LeaveStatus.PENDING
      };
      (LeaveRepository.prototype.create as jest.Mock).mockResolvedValue(mockCreatedLeave);

      const result = await leaveService.submitLeave(schoolId, submitterId, applicantId, applicantType, dto);

      expect(LeaveRepository.prototype.findOverlappingLeaves).toHaveBeenCalledWith(
        applicantId,
        schoolId,
        new Date(dto.startDate),
        new Date(dto.endDate)
      );
      expect(LeaveRepository.prototype.create).toHaveBeenCalledWith(expect.objectContaining({
        schoolId,
        applicantType,
        applicantId,
        submittedBy: submitterId,
        leaveType: dto.leaveType,
        reason: dto.reason,
        status: LeaveStatus.PENDING,
        totalDays: 3
      }));
      expect(result).toEqual(mockCreatedLeave);
    });

    it('should successfully submit a half-day leave request', async () => {
      const dto: CreateLeaveDto = {
        leaveType: LeaveType.SICK_LEAVE,
        reason: 'Dental checkup',
        startDate: '2026-09-10T00:00:00Z',
        endDate: '2026-09-10T00:00:00Z',
        halfDay: true,
        halfType: HalfType.FIRST_HALF
      };

      (LeaveRepository.prototype.findOverlappingLeaves as jest.Mock).mockResolvedValue([]);
      (LeaveRepository.prototype.create as jest.Mock).mockResolvedValue({ id: 'leave-half-123' });

      await leaveService.submitLeave(schoolId, submitterId, applicantId, applicantType, dto);

      expect(LeaveRepository.prototype.create).toHaveBeenCalledWith(expect.objectContaining({
        halfDay: true,
        halfType: HalfType.FIRST_HALF,
        totalDays: 0
      }));
    });

    it('should throw AppError 409 if overlapping leave requests exist', async () => {
      const dto: CreateLeaveDto = {
        leaveType: LeaveType.CASUAL_LEAVE,
        reason: 'Going out of town',
        startDate: '2026-09-10T00:00:00Z',
        endDate: '2026-09-12T00:00:00Z'
      };

      (LeaveRepository.prototype.findOverlappingLeaves as jest.Mock).mockResolvedValue([{ id: 'existing-leave' }]);

      await expect(
        leaveService.submitLeave(schoolId, submitterId, applicantId, applicantType, dto)
      ).rejects.toThrow(new AppError('An overlapping pending or approved leave request already exists for this date range.', 409));
    });
  });

  describe('reviewLeave', () => {
    const leaveId = 'leave-123';
    const schoolId = 'school-123';
    const approverId = 'admin-456';

    it('should throw AppError 404 if leave request is not found', async () => {
      (LeaveRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      const reviewDto: ReviewLeaveDto = { status: LeaveStatus.APPROVED };

      await expect(
        leaveService.reviewLeave(leaveId, schoolId, approverId, reviewDto)
      ).rejects.toThrow(new AppError('Leave request not found', 404));
    });

    it('should throw AppError 404 if leave request belongs to a different school', async () => {
      (LeaveRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: leaveId,
        schoolId: 'other-school'
      });

      const reviewDto: ReviewLeaveDto = { status: LeaveStatus.APPROVED };

      await expect(
        leaveService.reviewLeave(leaveId, schoolId, approverId, reviewDto)
      ).rejects.toThrow(new AppError('Leave request not found', 404));
    });

    it('should throw AppError 400 if leave is not in PENDING status', async () => {
      (LeaveRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: leaveId,
        schoolId,
        status: LeaveStatus.APPROVED,
        applicantId: 'user-789'
      });

      const reviewDto: ReviewLeaveDto = { status: LeaveStatus.REJECTED, adminRemarks: 'Not needed' };

      await expect(
        leaveService.reviewLeave(leaveId, schoolId, approverId, reviewDto)
      ).rejects.toThrow(new AppError('Cannot review leave request. Current status is APPROVED', 400));
    });

    it('should throw AppError 403 if approver attempts to approve their own leave', async () => {
      (LeaveRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: leaveId,
        schoolId,
        status: LeaveStatus.PENDING,
        applicantId: approverId
      });

      const reviewDto: ReviewLeaveDto = { status: LeaveStatus.APPROVED };

      await expect(
        leaveService.reviewLeave(leaveId, schoolId, approverId, reviewDto)
      ).rejects.toThrow(new AppError('You are not authorized to approve your own leave request', 403));
    });

    it('should successfully review leave request when valid', async () => {
      (LeaveRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: leaveId,
        schoolId,
        status: LeaveStatus.PENDING,
        applicantId: 'user-789'
      });

      const mockReviewed = { id: leaveId, status: LeaveStatus.APPROVED };
      (LeaveRepository.prototype.updateStatus as jest.Mock).mockResolvedValue(mockReviewed);

      const reviewDto: ReviewLeaveDto = { status: LeaveStatus.APPROVED, adminRemarks: 'Approved' };
      const result = await leaveService.reviewLeave(leaveId, schoolId, approverId, reviewDto);

      expect(LeaveRepository.prototype.updateStatus).toHaveBeenCalledWith(
        leaveId,
        LeaveStatus.APPROVED,
        approverId,
        'Approved'
      );
      expect(result).toEqual(mockReviewed);
    });
  });

  describe('cancelLeave', () => {
    const leaveId = 'leave-123';
    const schoolId = 'school-123';
    const applicantId = 'user-123';

    it('should throw AppError 404 if leave request is not found', async () => {
      (LeaveRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        leaveService.cancelLeave(leaveId, schoolId, applicantId)
      ).rejects.toThrow(new AppError('Leave request not found', 404));
    });

    it('should throw AppError 403 if user is not the applicant', async () => {
      (LeaveRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: leaveId,
        schoolId,
        applicantId: 'other-user',
        status: LeaveStatus.PENDING
      });

      await expect(
        leaveService.cancelLeave(leaveId, schoolId, applicantId)
      ).rejects.toThrow(new AppError('You are not authorized to cancel this leave request', 403));
    });

    it('should throw AppError 400 if leave is not in PENDING status', async () => {
      (LeaveRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: leaveId,
        schoolId,
        applicantId,
        status: LeaveStatus.APPROVED
      });

      await expect(
        leaveService.cancelLeave(leaveId, schoolId, applicantId)
      ).rejects.toThrow(new AppError('Only pending leave requests can be cancelled', 400));
    });

    it('should successfully cancel leave request', async () => {
      (LeaveRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: leaveId,
        schoolId,
        applicantId,
        status: LeaveStatus.PENDING
      });

      const mockCancelled = { id: leaveId, status: LeaveStatus.CANCELLED };
      (LeaveRepository.prototype.updateStatus as jest.Mock).mockResolvedValue(mockCancelled);

      const result = await leaveService.cancelLeave(leaveId, schoolId, applicantId);

      expect(LeaveRepository.prototype.updateStatus).toHaveBeenCalledWith(leaveId, LeaveStatus.CANCELLED);
      expect(result).toEqual(mockCancelled);
    });
  });

  describe('getMyLeaves', () => {
    it('should calculate correct skip/take pagination and call repository findAll', async () => {
      const mockResult = { data: [{ id: 'leave-1' }], total: 1 };
      (LeaveRepository.prototype.findAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await leaveService.getMyLeaves('school-123', 'user-123', 2, 5);

      expect(LeaveRepository.prototype.findAll).toHaveBeenCalledWith('school-123', {
        applicantId: 'user-123',
        skip: 5,
        take: 5
      });
      expect(result).toEqual(mockResult);
    });

    it('should default to page 1 and limit 10', async () => {
      (LeaveRepository.prototype.findAll as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      await leaveService.getMyLeaves('school-123', 'user-123');

      expect(LeaveRepository.prototype.findAll).toHaveBeenCalledWith('school-123', {
        applicantId: 'user-123',
        skip: 0,
        take: 10
      });
    });
  });
});
