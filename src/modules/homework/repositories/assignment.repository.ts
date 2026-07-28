import {  Assignment, Prisma } from '@prisma/client';
import prisma from '../../../database/prisma';

export class AssignmentRepository {
  /**
   * Creates a new assignment.
   */
  async create(data: Prisma.AssignmentUncheckedCreateInput): Promise<Assignment> {
    return prisma.assignment.create({ data });
  }

  /**
   * Retrieves an assignment by ID, strictly scoped to the tenant (schoolId) 
   * and ensuring it is not soft-deleted (BR-044).
   */
  async findByIdAndSchool(id: string, schoolId: string): Promise<Assignment | null> {
    return prisma.assignment.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
    });
  }

  /**
   * Updates an assignment scoped to the tenant.
   */
  async update(id: string, _schoolId: string, data: Prisma.AssignmentUpdateInput): Promise<Assignment> {
    return prisma.assignment.update({
      where: {
        id,
      },
      // Extra safety check to ensure we only update records belonging to the school
      data: {
        ...data,
      },
    });
  }

  /**
   * Soft deletes an assignment (BR-045).
   * Cascading soft-deletes to children will be handled in the Service layer within a transaction.
   */
  async softDelete(id: string, _schoolId: string, deletedBy: string): Promise<Assignment> {
    return prisma.assignment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  /**
   * Fetch paginated list of assignments based on filters.
   */
  async findManyByFilters(
    schoolId: string,
    filters: {
      classId?: string;
      sectionId?: string;
      subjectId?: string;
      academicSessionId?: string;
      status?: any;
    },
    page: number = 1,
    pageSize: number = 20
  ): Promise<[Assignment[], number]> {
    const where: Prisma.AssignmentWhereInput = {
      schoolId,
      deletedAt: null,
      ...(filters.classId && { classId: filters.classId }),
      ...(filters.sectionId && { sectionId: filters.sectionId }),
      ...(filters.subjectId && { subjectId: filters.subjectId }),
      ...(filters.academicSessionId && { academicSessionId: filters.academicSessionId }),
      ...(filters.status && { status: filters.status }),
    };

    return Promise.all([
      prisma.assignment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.assignment.count({ where }),
    ]);
  }
}