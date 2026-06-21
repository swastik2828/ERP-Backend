import {   Prisma, StudentStatus } from '@prisma/client';
import { prisma } from '../../../database/prisma'; // Adjust path to your prisma client

export class StudentRepository {
  // Find all active (non-deleted) students
  async findAll(schoolId: string, filters?: any) {
    return prisma.student.findMany({
      where: {
        schoolId,
        deletedAt: null, // PRD: Soft Delete implementation
        ...filters,
      },
      include: {
        class: true,
        section: true,
        parents: {
          include: { parent: true }
        }
      }
    });
  }

  async findById(studentId: string, schoolId: string) {
    return prisma.student.findFirst({
      where: { id: studentId, schoolId, deletedAt: null },
      include: {
        parents: { include: { parent: true } },
        documents: true,
        academicHistory: { orderBy: { eventDate: 'desc' } }
      }
    });
  }

  // PRD: Support enterprise-grade auditing & Transactions
  async createWithAdmission(data: Prisma.StudentCreateInput, auditUserId: string) {
    return prisma.$transaction(async (tx) => {
      const student = await tx.student.create({ data });
      
      // PRD: Immutable history creation on Admission
      await tx.academicHistory.create({
        data: {
          studentId: student.id,
          eventType: 'ADMISSION',
          newClassId: data.class.connect?.id,
          notes: 'New Student Admission',
          createdBy: auditUserId
        }
      });

      // PRD: Audit Logging
      await tx.auditLog.create({
        data: {
          actorId: auditUserId,
          action: 'CREATE',
          entityType: 'STUDENT',
          entityId: student.id,
        }
      });

      return student;
    });
  }

  // PRD: Soft Deletion logic
  async softDelete(studentId: string, auditUserId: string) {
    return prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id: studentId },
        data: { 
          deletedAt: new Date(),
          status: StudentStatus.ARCHIVED 
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: auditUserId,
          action: 'SOFT_DELETE',
          entityType: 'STUDENT',
          entityId: studentId,
        }
      });

      return student;
    });
  }
}