import { LeaveRepository } from '../repositories/leave.repository';
import { CreateLeaveDto, ReviewLeaveDto } from '../dtos/leave.dto';
import { AppError } from '../../../errors/AppError';
import { LeaveStatus, LeaveApplicantType } from '@prisma/client';

export class LeaveService {
  private leaveRepository = new LeaveRepository();

  async submitLeave(
    schoolId: string,
    submitterId: string,
    applicantId: string,
    applicantType: LeaveApplicantType,
    data: CreateLeaveDto
  ) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    const overlappingLeaves = await this.leaveRepository.findOverlappingLeaves(
      applicantId,
      schoolId,
      startDate,
      endDate
    );

    if (overlappingLeaves.length > 0) {
      throw new AppError('An overlapping pending or approved leave request already exists for this date range.', 409);
    }

    const timeDiff = endDate.getTime() - startDate.getTime();
    const totalDays = data.halfDay ? 0.5 : Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    return this.leaveRepository.create({
      schoolId,
      applicantType,
      applicantId,
      submittedBy: submitterId,
      studentId: data.studentId,
      leaveType: data.leaveType,
      reason: data.reason,
      startDate,
      endDate,
      totalDays: Math.floor(totalDays), 
      halfDay: data.halfDay,
      halfType: data.halfType,
      priority: data.priority,
      attachment: data.attachment,
      remarks: data.remarks,
      status: LeaveStatus.PENDING
    });
  }

  async reviewLeave(
    leaveId: string,
    schoolId: string,
    approverId: string,
    data: ReviewLeaveDto
  ) {
    const leave = await this.leaveRepository.findById(leaveId, schoolId);
    
    if (!leave || leave.schoolId !== schoolId) {
      throw new AppError('Leave request not found', 404);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new AppError(`Cannot review leave request. Current status is ${leave.status}`, 400);
    }

    if (leave.applicantId === approverId) {
      throw new AppError('You are not authorized to approve your own leave request', 403);
    }

    // Removed the schoolId parameter from this call
    return this.leaveRepository.updateStatus(
      leaveId,
      data.status,
      approverId,
      data.adminRemarks
    );
  }

  async cancelLeave(leaveId: string, schoolId: string, applicantId: string) {
    const leave = await this.leaveRepository.findById(leaveId, schoolId);

    if (!leave || leave.schoolId !== schoolId) {
      throw new AppError('Leave request not found', 404);
    }

    if (leave.applicantId !== applicantId) {
      throw new AppError('You are not authorized to cancel this leave request', 403);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new AppError('Only pending leave requests can be cancelled', 400);
    }

    // Fixed parameter passing here as well
    return this.leaveRepository.updateStatus(leaveId, LeaveStatus.CANCELLED);
  }

  async getMyLeaves(schoolId: string, applicantId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return this.leaveRepository.findAll(schoolId, { applicantId, skip, take: limit });
  }
}