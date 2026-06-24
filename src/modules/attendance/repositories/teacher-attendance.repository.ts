import prisma from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class TeacherAttendanceRepository {
  async findRecordByDate(teacherId: string, attendanceDate: Date, schoolId: string) {
    return await prisma.teacherAttendance.findFirst({
      where: { teacherId, attendanceDate, schoolId }
    });
  }

  async createCheckIn(data: Prisma.TeacherAttendanceCreateInput) {
    return await prisma.teacherAttendance.create({ data });
  }

  async updateCheckOut(id: string, checkOutTime: Date, remarks?: string) {
    return await prisma.teacherAttendance.update({
      where: { id },
      data: { checkOutTime, remarks, updatedAt: new Date() }
    });
  }
}