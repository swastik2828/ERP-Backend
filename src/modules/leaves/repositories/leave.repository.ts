import { Prisma, LeaveRequest, LeaveStatus } from '@prisma/client';
import { prisma } from '../../../database/prisma';

export class LeaveRepository {
  async create(data: Prisma.LeaveRequestUncheckedCreateInput): Promise<LeaveRequest> {
    return prisma.leaveRequest.create({ data });
  }

  async findById(id: string, schoolId: string): Promise<LeaveRequest | null> {
    return prisma.leaveRequest.findFirst({
      where: { id, schoolId },
      include: { 
        applicant: { select: { id: true } },
        approver: { select: { id: true } }
      }
    });
  }

  async findOverlappingLeaves(
    applicantId: string,
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<LeaveRequest[]> {
    return prisma.leaveRequest.findMany({
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
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    approverId?: string,
    adminRemarks?: string
  ): Promise<LeaveRequest> {
    const isApproval = status === LeaveStatus.APPROVED;
    const isRejection = status === LeaveStatus.REJECTED;
    const isCancellation = status === LeaveStatus.CANCELLED;

    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        ...(approverId && { approverId }),
        ...(adminRemarks && { adminRemarks }),
        ...(isApproval && { approvedAt: new Date() }),
        ...(isRejection && { rejectedAt: new Date() }),
        ...(isCancellation && { cancelledAt: new Date() })
      }
    });
  }

  async findAll(
    schoolId: string,
    filters: {
      applicantId?: string;
      status?: LeaveStatus;
      skip?: number;
      take?: number;
    }
  ) {
    const where: Prisma.LeaveRequestWhereInput = {
      schoolId,
      ...(filters.applicantId && { applicantId: filters.applicantId }),
      ...(filters.status && { status: filters.status })
    };

    const [data, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip: filters.skip || 0,
        take: filters.take || 10,
        orderBy: { createdAt: 'desc' },
        include: { applicant: { select: { id: true } } }
      }),
      prisma.leaveRequest.count({ where })
    ]);

    return { data, total };
  }
}