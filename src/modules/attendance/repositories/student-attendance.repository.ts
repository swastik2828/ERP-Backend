import prisma from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class StudentAttendanceRepository {
  async createBulk(data: Prisma.AttendanceRecordCreateManyInput[]) {
    // Uses Prisma's createMany for performance as per PRD (100 students < 2 seconds)
    return await prisma.attendanceRecord.createMany({
      data,
      skipDuplicates: true, // Prevents throwing errors on duplicate submissions
    });
  }

  async findById(id: string, schoolId: string) {
    return await prisma.attendanceRecord.findFirst({
      where: { id, schoolId, deletedAt: null }
    });
  }

  async update(id: string, data: Prisma.AttendanceRecordUpdateInput) {
    return await prisma.attendanceRecord.update({
      where: { id },
      data,
    });
  }

  async getHistory(studentId: string, schoolId: string, startDate?: Date, endDate?: Date) {
    const whereClause: Prisma.AttendanceRecordWhereInput = {
      studentId,
      schoolId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      whereClause.attendanceDate = {};
      if (startDate) whereClause.attendanceDate.gte = startDate;
      if (endDate) whereClause.attendanceDate.lte = endDate;
    }

    return await prisma.attendanceRecord.findMany({
      where: whereClause,
      orderBy: { attendanceDate: 'desc' },
    });
  }

  async createCorrectionRequest(data: Prisma.AttendanceCorrectionRequestCreateInput) {
    return await prisma.attendanceCorrectionRequest.create({
      data,
    });
  }
}