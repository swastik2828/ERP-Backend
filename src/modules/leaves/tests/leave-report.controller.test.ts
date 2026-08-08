import { Request, Response, NextFunction } from 'express';
import { LeaveReportController } from '../controllers/leave-report.controller';
import { LeaveReportService } from '../services/leave-report.service';
import { LeaveStatus } from '@prisma/client';

jest.mock('../services/leave-report.service');

describe('LeaveReportController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'admin-123',
        schoolId: 'school-123',
        role: 'SCHOOL_ADMIN',
        email: 'admin@school.com'
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

  describe('getStatistics', () => {
    it('should return 200 with aggregated statistics data', async () => {
      const mockStats = {
        studentLeaves: { pending: 3, approvedToday: 1, monthlyCount: 15 },
        teacherLeaves: { pending: 2, approved: 8 }
      };

      (LeaveReportService.prototype.getStatistics as jest.Mock).mockResolvedValue(mockStats);

      await LeaveReportController.getStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(LeaveReportService.prototype.getStatistics).toHaveBeenCalledWith('school-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Leave statistics retrieved successfully',
        data: mockStats
      });
    });

    it('should pass error to next on failure', async () => {
      const error = new Error('Database query failure');
      (LeaveReportService.prototype.getStatistics as jest.Mock).mockRejectedValue(error);

      await LeaveReportController.getStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getReport', () => {
    it('should return 200 with generated leave report', async () => {
      mockReq.query = {
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T23:59:59.000Z',
        status: LeaveStatus.APPROVED
      };

      const mockReport = [{ id: 'leave-1' }, { id: 'leave-2' }];
      (LeaveReportService.prototype.getReport as jest.Mock).mockResolvedValue(mockReport);

      await LeaveReportController.getReport(mockReq as Request, mockRes as Response, mockNext);

      expect(LeaveReportService.prototype.getReport).toHaveBeenCalledWith('school-123', {
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T23:59:59.000Z',
        status: LeaveStatus.APPROVED
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Leave report generated successfully',
        data: mockReport
      });
    });

    it('should pass error to next on failure', async () => {
      const error = new Error('Report generation error');
      (LeaveReportService.prototype.getReport as jest.Mock).mockRejectedValue(error);

      await LeaveReportController.getReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
