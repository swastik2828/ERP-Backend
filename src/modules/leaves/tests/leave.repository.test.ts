import { LeaveRepository } from '../repositories/leave.repository';
import { prisma } from '../../../database/prisma';
import { LeaveStatus, LeaveApplicantType, LeaveType } from '@prisma/client';

jest.mock('../../../database/prisma', () => ({
  prisma: {
    leaveRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    }
  }
}));

describe('LeaveRepository', () => {
  let leaveRepository: LeaveRepository;

  beforeEach(() => {
    leaveRepository = new LeaveRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a leave request entry via prisma', async () => {
      const mockData = {
        schoolId: 'school-123',
        applicantType: LeaveApplicantType.TEACHER,
        applicantId: 'user-123',
        submittedBy: 'user-123',
        leaveType: LeaveType.SICK_LEAVE,
        reason: 'Fever and cold',
        startDate: new Date('2026-09-10'),
        endDate: new Date('2026-09-11'),
        totalDays: 2,
        status: LeaveStatus.PENDING
      };

      const mockResponse = { id: 'leave-123', ...mockData, createdAt: new Date(), updatedAt: new Date() };
      (prisma.leaveRequest.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await leaveRepository.create(mockData as any);

      expect(prisma.leaveRequest.create).toHaveBeenCalledWith({ data: mockData });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findById', () => {
    it('should find a leave request by id and schoolId with relations', async () => {
      const mockLeave = {
        id: 'leave-123',
        schoolId: 'school-123',
        applicant: { id: 'user-123' },
        approver: null
      };

      (prisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(mockLeave);

      const result = await leaveRepository.findById('leave-123', 'school-123');

      expect(prisma.leaveRequest.findFirst).toHaveBeenCalledWith({
        where: { id: 'leave-123', schoolId: 'school-123' },
        include: {
          applicant: { select: { id: true } },
          approver: { select: { id: true } }
        }
      });
      expect(result).toEqual(mockLeave);
    });
  });

  describe('findOverlappingLeaves', () => {
    it('should query prisma for overlapping pending or approved leave requests', async () => {
      const applicantId = 'user-123';
      const schoolId = 'school-123';
      const startDate = new Date('2026-09-10');
      const endDate = new Date('2026-09-12');

      const mockOverlaps = [{ id: 'leave-overlap-1' }];
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(mockOverlaps);

      const result = await leaveRepository.findOverlappingLeaves(applicantId, schoolId, startDate, endDate);

      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith({
        where: {
          applicantId,
          schoolId,
          status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      });
      expect(result).toEqual(mockOverlaps);
    });
  });

  describe('updateStatus', () => {
    it('should update status to APPROVED and set approverId, adminRemarks, and approvedAt', async () => {
      const mockUpdated = { id: 'leave-123', status: LeaveStatus.APPROVED };
      (prisma.leaveRequest.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await leaveRepository.updateStatus('leave-123', LeaveStatus.APPROVED, 'admin-1', 'Looks good');

      expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
        where: { id: 'leave-123' },
        data: {
          status: LeaveStatus.APPROVED,
          approverId: 'admin-1',
          adminRemarks: 'Looks good',
          approvedAt: expect.any(Date)
        }
      });
      expect(result).toEqual(mockUpdated);
    });

    it('should update status to REJECTED and set rejectedAt date', async () => {
      const mockUpdated = { id: 'leave-123', status: LeaveStatus.REJECTED };
      (prisma.leaveRequest.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await leaveRepository.updateStatus('leave-123', LeaveStatus.REJECTED, 'admin-1', 'Denied');

      expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
        where: { id: 'leave-123' },
        data: {
          status: LeaveStatus.REJECTED,
          approverId: 'admin-1',
          adminRemarks: 'Denied',
          rejectedAt: expect.any(Date)
        }
      });
      expect(result).toEqual(mockUpdated);
    });

    it('should update status to CANCELLED and set cancelledAt date', async () => {
      const mockUpdated = { id: 'leave-123', status: LeaveStatus.CANCELLED };
      (prisma.leaveRequest.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await leaveRepository.updateStatus('leave-123', LeaveStatus.CANCELLED);

      expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
        where: { id: 'leave-123' },
        data: {
          status: LeaveStatus.CANCELLED,
          cancelledAt: expect.any(Date)
        }
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('findAll', () => {
    it('should fetch leaves with pagination and optional filters and return count', async () => {
      const schoolId = 'school-123';
      const mockData = [{ id: 'leave-1' }, { id: 'leave-2' }];
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(mockData);
      (prisma.leaveRequest.count as jest.Mock).mockResolvedValue(2);

      const result = await leaveRepository.findAll(schoolId, {
        applicantId: 'user-123',
        status: LeaveStatus.PENDING,
        skip: 0,
        take: 10
      });

      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-123',
          applicantId: 'user-123',
          status: LeaveStatus.PENDING
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { applicant: { select: { id: true } } }
      });
      expect(prisma.leaveRequest.count).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-123',
          applicantId: 'user-123',
          status: LeaveStatus.PENDING
        }
      });
      expect(result).toEqual({ data: mockData, total: 2 });
    });

    it('should default skip to 0 and take to 10 if not provided', async () => {
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.leaveRequest.count as jest.Mock).mockResolvedValue(0);

      await leaveRepository.findAll('school-123', {});

      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10
        })
      );
    });
  });
});
