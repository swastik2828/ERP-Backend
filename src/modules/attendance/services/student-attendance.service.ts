import { StudentAttendanceRepository } from '../repositories/student-attendance.repository';
import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import { StudentAttendanceStatus, Role } from '@prisma/client';

export class StudentAttendanceService {
  private repository = new StudentAttendanceRepository();

  async markBulkAttendance(
    schoolId: string,
    academicSessionId: string,
    markedBy: string,
    attendanceDateStr: string,
    records: { studentId: string; status: StudentAttendanceStatus; remarks?: string }[]
  ) {
    const attendanceDate = new Date(attendanceDateStr);
    
    // PRD Validation: Attendance date cannot exceed current date
    if (attendanceDate > new Date()) {
      throw new AppError('Attendance date cannot be in the future', 400);
    }

    // Verify students are ACTIVE and belong to the school (PRD Sec 8)
    const studentIds = records.map(r => r.studentId);
    const validStudents = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId,
        status: 'ACTIVE',
        deletedAt: null
      },
      select: { id: true, admissionDate: true }
    });

    const validStudentMap = new Map(validStudents.map(s => [s.id, s]));

    const payload = records.filter(record => {
      const student = validStudentMap.get(record.studentId);
      if (!student) return false;
      // PRD Validation: Attendance date cannot be before admission date
      if (attendanceDate < student.admissionDate) return false;
      return true;
    }).map(record => ({
      schoolId,
      studentId: record.studentId,
      academicSessionId,
      attendanceDate,
      status: record.status,
      remarks: record.remarks,
      markedBy,
    }));

    if (payload.length === 0) {
      throw new AppError('No valid active students found for attendance marking', 400);
    }

    // Wrap in transaction for consistency and audit logging
    await prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.createMany({
        data: payload,
        skipDuplicates: true,
      });

      await tx.auditLog.create({
        data: {
          actorId: markedBy,
          action: 'ATTENDANCE_MARKED',
          entityType: 'BULK_ATTENDANCE',
          ipAddress: 'System', // Usually passed from req.ip
        }
      });
    });

    return { message: 'Bulk attendance recorded successfully', processed: payload.length };
  }

  async updateAttendance(
    recordId: string,
    schoolId: string,
    updaterId: string,
    updaterRole: Role,
    newStatus: StudentAttendanceStatus,
    reason: string
  ) {
    const record = await this.repository.findById(recordId, schoolId);
    if (!record) throw new AppError('Attendance record not found', 404);

    const isLocked = (new Date().getTime() - record.createdAt.getTime()) > 24 * 60 * 60 * 1000;

    await prisma.$transaction(async (tx) => {
      if (isLocked) {
        // PRD Sec 5: After 24 hours, only SCHOOL_ADMIN can edit via Correction Request
        if (updaterRole !== Role.SCHOOL_ADMIN && updaterRole !== Role.SUPER_ADMIN) {
          throw new AppError('Attendance locked. Only Administrators can update historical records.', 403);
        }

        await tx.attendanceCorrectionRequest.create({
          data: {
            schoolId,
            attendanceRecordId: record.id,
            oldStatus: record.status,
            newStatus,
            reason,
            requestedBy: updaterId,
            approvedBy: updaterId, // Auto-approve if admin does it directly
            approvedAt: new Date(),
            status: 'APPROVED',
          }
        });
      }

      await tx.attendanceRecord.update({
        where: { id: record.id },
        data: {
          status: newStatus,
          remarks: reason,
          updatedBy: updaterId,
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: updaterId,
          action: isLocked ? 'ATTENDANCE_CORRECTED' : 'ATTENDANCE_UPDATED',
          entityType: 'ATTENDANCE_RECORD',
          entityId: record.id,
        }
      });
    });

    return { message: 'Attendance updated successfully' };
  }
}