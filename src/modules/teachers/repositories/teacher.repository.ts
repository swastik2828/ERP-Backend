import { Prisma,  TeacherStatus } from '@prisma/client';
import prisma from '../../../database/prisma';

export class TeacherRepository {
  // Returns a base query object to enforce tenant isolation
  private getTenantCondition(schoolId: string) {
    return { schoolId, deletedAt: null };
  }

  async findById(schoolId: string, id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.teacher.findFirst({
      where: { ...this.getTenantCondition(schoolId), id },
      include: {
        user: { select: { email: true, isActive: true, accountStatus: true } },
        address: true,
        school: { select: { name: true } }
      },
    });
  }

  async findAll(schoolId: string, params: {
    skip?: number;
    take?: number;
    where?: Prisma.TeacherWhereInput;
    orderBy?: Prisma.TeacherOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    
    const [data, total] = await Promise.all([
      prisma.teacher.findMany({
        skip,
        take,
        where: { ...this.getTenantCondition(schoolId), ...where },
        orderBy,
        include: { user: { select: { email: true } } }
      }),
      prisma.teacher.count({
        where: { ...this.getTenantCondition(schoolId), ...where },
      })
    ]);

    return { data, total };
  }

  async createWithUserTx(
    tx: Prisma.TransactionClient,
    teacherData: Prisma.TeacherCreateInput
  ) {
    return tx.teacher.create({
      data: teacherData,
      include: { user: true, address: true },
    });
  }

  async update(schoolId: string, id: string, data: Prisma.TeacherUpdateInput) {
    // First ensure it exists and belongs to the school
    const teacher = await this.findById(schoolId, id);
    if (!teacher) return null;

    return prisma.teacher.update({
      where: { id },
      data,
      include: { address: true }
    });
  }

  async softDelete(schoolId: string, id: string, deletedBy: string) {
    const teacher = await this.findById(schoolId, id);
    if (!teacher) return null;

    return prisma.teacher.update({
      where: { id },
      data: {
        status: TeacherStatus.INACTIVE,
        deletedAt: new Date(),
        updatedBy: deletedBy
      }
    });
  }

  // PRD FR-08: Class Teacher Assignments
  async assignClassTeacher(
    tx: Prisma.TransactionClient,
    assignmentData: Prisma.ClassTeacherAssignmentCreateInput
  ) {
    return tx.classTeacherAssignment.create({
      data: assignmentData,
    });
  }
}

export const teacherRepository = new TeacherRepository();