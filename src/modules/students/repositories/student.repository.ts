import { Prisma, Student } from '@prisma/client';
import prisma from '../../../database/prisma';

export class StudentRepository {
  async findByEnrollmentNumber(enrollmentNumber: string, schoolId: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { enrollmentNumber, schoolId }
    });
  }

  async getStudents(
    schoolId: string, 
    params: { skip: number; take: number; classId?: string; search?: string }
  ) {
    const where: Prisma.StudentWhereInput = { schoolId };
    
    if (params.classId) where.classId = params.classId;
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { enrollmentNumber: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const [data, total] = await Promise.all([
      prisma.student.findMany({
        skip: params.skip,
        take: params.take,
        where,
        include: {
          academicClass: { select: { name: true, section: true } },
          parent: { select: { firstName: true, lastName: true, primaryPhone: true } }
        },
        orderBy: { firstName: 'asc' }
      }),
      prisma.student.count({ where })
    ]);

    return { data, total };
  }
}