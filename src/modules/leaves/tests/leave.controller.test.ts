import { Request, Response, NextFunction } from 'express';
import { LeaveController } from '../controllers/leave.controller';
import { LeaveService } from '../services/leave.service';
import { LeaveRepository } from '../repositories/leave.repository';
import { LeaveApplicantType, LeaveStatus } from '@prisma/client';
import { AppError } from '../../../errors/AppError';

jest.mock('../services/leave.service');
jest.mock('../repositories/leave.repository');

describe('LeaveController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        schoolId: 'school-123',
        role: 'TEACHER',
        email: 'teacher@school.com'
      },
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('submitLeave', () => {
    it('should submit leave with role mapped to TEACHER and return 201', async () => {
      mockReq.body = {
        leaveType: 'CASUAL',
        reason: 'Personal work',
        startDate: '2026-09-10T00:00:00.000Z',
        endDate: '2026-09-11T00:00:00.000Z'
      };

      const mockLeave = { id: 'leave-123', status: 'PENDING' };
      (LeaveService.prototype.submitLeave as jest.Mock).mockResolvedValue(mockLeave);

      await LeaveController.submitLeave(mockReq as Request, mockRes as Response, mockNext);

      expect(LeaveService.prototype.submitLeave).toHaveBeenCalledWith(
        'school-123',
        'user-123',
        'user-123',
        LeaveApplicantType.TEACHER,
        mockReq.body
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Leave request submitted successfully',
        data: mockLeave
      });
    });

    it('should fallback role mapping to STAFF for unknown user roles', async () => {
      mockReq.user = { id: 'user-123', schoolId: 'school-123', role: 'ACCOUNTANT' } as any;
      (LeaveService.prototype.submitLeave as jest.Mock).mockResolvedValue({ id: 'leave-123' });

      await LeaveController.submitLeave(mockReq as Request, mockRes as Response, mockNext);

      expect(LeaveService.prototype.submitLeave).toHaveBeenCalledWith(
        'school-123',
        'user-123',
        'user-123',
        LeaveApplicantType.STAFF,
        mockReq.body
      );
    });

    it('should pass error to next if submitLeave service throws', async () => {
      const error = new AppError('Overlapping leave request', 409);
      (LeaveService.prototype.submitLeave as jest.Mock).mockRejectedValue(error);

      await LeaveController.submitLeave(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getMyLeaves', () => {
    it('should return 200 with my leaves history using pagination query params', async () => {
      mockReq.query = { page: '2', limit: '5' };
      const mockData = { data: [{ id: 'leave-1' }], total: 1 };
      (LeaveService.prototype.getMyLeaves as jest.Mock).mockResolvedValue(mockData);

      await LeaveController.getMyLeaves(mockReq as Request, mockRes as Response, mockNext);

      expect(LeaveService.prototype.getMyLeaves).toHaveBeenCalledWith('school-123', 'user-123', 2, 5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Leave history retrieved successfully',
        data: mockData
      });
    });

    it('should default page to 1 and limit to 10 when not provided', async () => {
      (LeaveService.prototype.getMyLeaves as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      await LeaveController.getMyLeaves(mockReq as Request, mockRes as Response, mockNext);

      expect(LeaveService.prototype.getMyLeaves).toHaveBeenCalledWith('school-123', 'user-123', 1, 10);
    });

    it('should pass error to next on failure', async () => {
      const error = new Error('Database error');
      (LeaveService.prototype.getMyLeaves as jest.Mock).mockRejectedValue(error);

      await LeaveController.getMyLeaves(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getReviewableLeaves', () => {
    it('should return 200 with reviewable leaves list', async () => {
      mockReq.query = { status: LeaveStatus.PENDING, page: '1', limit: '10' };
      const mockResult = { data: [{ id: 'leave-1' }], total: 1 };
      (LeaveRepository.prototype.findAll as jest.Mock).mockResolvedValue(mockResult);

      await LeaveController.getReviewableLeaves(mockReq as Request, mockRes as Response, mockNext);

      expect(LeaveRepository.prototype.findAll).toHaveBeenCalledWith('school-123', {
        status: LeaveStatus.PENDING,
        skip: 0,
        take: 10
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Reviewable leaves retrieved successfully',
        data: mockResult
      });
    });

    it('should pass error to next on failure', async () => {
      const error = new Error('Repository error');
      (LeaveRepository.prototype.findAll as jest.Mock).mockRejectedValue(error);

      await LeaveController.getReviewableLeaves(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('reviewLeave', () => {
    it('should review leave request and return status message with 200', async () => {
      mockReq.params = { id: 'leave-123' };
      mockReq.body = { status: 'APPROVED', adminRemarks: 'Approved by Principal' };
      const mockReviewed = { id: 'leave-123', status: LeaveStatus.APPROVED };

      (LeaveService.prototype.reviewLeave as jest.Mock).mockResolvedValue(mockReviewed);

      await LeaveController.reviewLeave(mockReq as Request, mockRes as Response, mockNext);

      expect(LeaveService.prototype.reviewLeave).toHaveBeenCalledWith(
        'leave-123',
        'school-123',
        'user-123',
        mockReq.body
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Leave request approved successfully',
        data: mockReviewed
      });
    });

    it('should pass error to next on failure', async () => {
      mockReq.params = { id: 'leave-123' };
      mockReq.body = { status: 'REJECTED', adminRemarks: 'No quota' };
      const error = new AppError('Leave request not found', 404);

      (LeaveService.prototype.reviewLeave as jest.Mock).mockRejectedValue(error);

      await LeaveController.reviewLeave(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('cancelLeave', () => {
    it('should cancel leave request and return 200', async () => {
      mockReq.params = { id: 'leave-123' };
      const mockCancelled = { id: 'leave-123', status: LeaveStatus.CANCELLED };

      (LeaveService.prototype.cancelLeave as jest.Mock).mockResolvedValue(mockCancelled);

      await LeaveController.cancelLeave(mockReq as Request, mockRes as Response, mockNext);

      expect(LeaveService.prototype.cancelLeave).toHaveBeenCalledWith('leave-123', 'school-123', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Leave request cancelled successfully',
        data: mockCancelled
      });
    });

    it('should pass error to next on failure', async () => {
      mockReq.params = { id: 'leave-123' };
      const error = new AppError('Only pending leave requests can be cancelled', 400);

      (LeaveService.prototype.cancelLeave as jest.Mock).mockRejectedValue(error);

      await LeaveController.cancelLeave(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
