import { TeacherAttendanceRepository } from '../repositories/teacher-attendance.repository';
import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import { TeacherAttendanceStatus } from '@prisma/client';

export class TeacherAttendanceService {
  private repository = new TeacherAttendanceRepository();

  async checkIn(teacherId: string, schoolId: string, recordedBy: string, remarks?: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Normalize to start of day

    // PRD Validation: Teacher must be active
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId, status: 'ACTIVE', deletedAt: null }
    });

    if (!teacher) throw new AppError('Active teacher not found', 404);

    // PRD Validation: Duplicate check-in prohibited
    const existing = await this.repository.findRecordByDate(teacherId, today, schoolId);
    if (existing && existing.checkInTime) {
      throw new AppError('Teacher is already checked in for today', 400);
    }

    const checkInRecord = await this.repository.createCheckIn({
      school: { connect: { id: schoolId } },
      teacher: { connect: { id: teacherId } },
      attendanceDate: today,
      status: TeacherAttendanceStatus.PRESENT,
      checkInTime: new Date(),
      recordedBy,
      remarks,
    });

    await prisma.auditLog.create({
      data: {
        actorId: recordedBy,
        action: 'CHECKIN_CREATED',
        entityType: 'TEACHER_ATTENDANCE',
        entityId: checkInRecord.id,
      }
    });

    return checkInRecord;
  }

  async checkOut(teacherId: string, schoolId: string, recordedBy: string, remarks?: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await this.repository.findRecordByDate(teacherId, today, schoolId);
    
    // PRD Validation: Check-out requires valid check-in
    if (!record || !record.checkInTime) {
      throw new AppError('No check-in found for today. Cannot check out.', 400);
    }

    if (record.checkOutTime) {
      throw new AppError('Already checked out for today.', 400);
    }

    const checkOutTime = new Date();
    
    // PRD Validation: Check-out time must exceed check-in time
    if (checkOutTime <= record.checkInTime) {
      throw new AppError('Check-out time must be after check-in time.', 400);
    }

    const updatedRecord = await this.repository.updateCheckOut(record.id, checkOutTime, remarks);

    await prisma.auditLog.create({
      data: {
        actorId: recordedBy,
        action: 'CHECKOUT_CREATED',
        entityType: 'TEACHER_ATTENDANCE',
        entityId: updatedRecord.id,
      }
    });

    return updatedRecord;
  }
}