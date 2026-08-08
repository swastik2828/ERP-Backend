import { Prisma, LeaveStatus, LeaveApplicantType } from '@prisma/client';
import { prisma } from '../../../database/prisma';

export class LeaveReportService {
  async getStatistics(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      studentPending,
      studentApprovedToday,
      teacherPending,
      teacherApproved,
      totalMonthly
    ] = await Promise.all([
      // Student Pending
      prisma.leaveRequest.count({ 
        where: { schoolId, applicantType: LeaveApplicantType.STUDENT, status: LeaveStatus.PENDING } 
      }),
      // Student Approved Today
      prisma.leaveRequest.count({ 
        where: { schoolId, applicantType: LeaveApplicantType.STUDENT, status: LeaveStatus.APPROVED, approvedAt: { gte: today } } 
      }),
      // Teacher/Staff Pending
      prisma.leaveRequest.count({ 
        where: { schoolId, applicantType: { in: [LeaveApplicantType.TEACHER, LeaveApplicantType.STAFF] }, status: LeaveStatus.PENDING } 
      }),
      // Teacher/Staff Approved
      prisma.leaveRequest.count({ 
        where: { schoolId, applicantType: { in: [LeaveApplicantType.TEACHER, LeaveApplicantType.STAFF] }, status: LeaveStatus.APPROVED } 
      }),
      // Monthly Total (All)
      prisma.leaveRequest.count({
        where: { schoolId, createdAt: { gte: firstDayOfMonth } }
      })
    ]);

    return {
      studentLeaves: {
        pending: studentPending,
        approvedToday: studentApprovedToday,
        monthlyCount: totalMonthly
      },
      teacherLeaves: {
        pending: teacherPending,
        approved: teacherApproved
      }
    };
  }

  async getReport(schoolId: string, filters: { startDate?: string; endDate?: string; status?: LeaveStatus }) {
    const where: Prisma.LeaveRequestWhereInput = {
      schoolId,
      ...(filters.status && { status: filters.status }),
      ...(filters.startDate && filters.endDate && {
        createdAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        }
      })
    };

    return prisma.leaveRequest.findMany({
      where,
      include: {
        applicant: { select: { id: true } },
        approver: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}