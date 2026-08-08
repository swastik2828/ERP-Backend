import { LeaveReportService } from '../services/leave-report.service';
import { prisma } from '../../../database/prisma';
import { LeaveApplicantType, LeaveStatus } from '@prisma/client';

jest.mock('../../../database/prisma', () => ({
  prisma: {
    leaveRequest: {
      count: jest.fn(),
      findMany: jest.fn()
    }
  }
}));

describe('LeaveReportService', () => {
  let leaveReportService: LeaveReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    leaveReportService = new LeaveReportService();
  });

  describe('getStatistics', () => {
    it('should aggregate leave statistics for students and teachers', async () => {
      (prisma.leaveRequest.count as jest.Mock)
        .mockResolvedValueOnce(5)  // studentPending
        .mockResolvedValueOnce(2)  // studentApprovedToday
        .mockResolvedValueOnce(3)  // teacherPending
        .mockResolvedValueOnce(10) // teacherApproved
        .mockResolvedValueOnce(20); // totalMonthly

      const result = await leaveReportService.getStatistics('school-123');

      expect(prisma.leaveRequest.count).toHaveBeenCalledTimes(5);
      expect(prisma.leaveRequest.count).toHaveBeenNthCalledWith(1, {
        where: { schoolId: 'school-123', applicantType: LeaveApplicantType.STUDENT, status: LeaveStatus.PENDING }
      });
      expect(prisma.leaveRequest.count).toHaveBeenNthCalledWith(2, {
        where: {
          schoolId: 'school-123',
          applicantType: LeaveApplicantType.STUDENT,
          status: LeaveStatus.APPROVED,
          approvedAt: { gte: expect.any(Date) }
        }
      });

      expect(result).toEqual({
        studentLeaves: {
          pending: 5,
          approvedToday: 2,
          monthlyCount: 20
        },
        teacherLeaves: {
          pending: 3,
          approved: 10
        }
      });
    });
  });

  describe('getReport', () => {
    it('should query leave reports with status and date filters', async () => {
      const mockReportData = [{ id: 'leave-1' }, { id: 'leave-2' }];
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(mockReportData);

      const filters = {
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T23:59:59.000Z',
        status: LeaveStatus.APPROVED
      };

      const result = await leaveReportService.getReport('school-123', filters);

      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-123',
          status: LeaveStatus.APPROVED,
          createdAt: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
            lte: new Date('2026-09-30T23:59:59.000Z')
          }
        },
        include: {
          applicant: { select: { id: true } },
          approver: { select: { id: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(result).toEqual(mockReportData);
    });

    it('should query leave reports without optional filters', async () => {
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      await leaveReportService.getReport('school-123', {});

      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-123' },
        include: {
          applicant: { select: { id: true } },
          approver: { select: { id: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });
});
