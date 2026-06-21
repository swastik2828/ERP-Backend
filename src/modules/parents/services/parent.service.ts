import {  RelationshipType } from '@prisma/client';
import { prisma } from '../../../database/prisma';
// import { AppError } from '../../../errors/AppError';

export class ParentService {
  /**
   * Creates a new parent profile [cite: 154-162].
   */
  async createParent(schoolId: string, userId: string, payload: any, auditUserId: string) {
    return prisma.$transaction(async (tx) => {
      const parent = await tx.parent.create({
        data: {
          schoolId,
          userId,
          firstName: payload.firstName,
          lastName: payload.lastName,
          primaryPhone: payload.mobile,
          occupation: payload.occupation,
        }
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'CREATE', entityType: 'PARENT', entityId: parent.id }
      });

      return parent;
    });
  }

  /**
   * Links a parent to a student (Enterprise Many-to-Many Support) [cite: 174-190].
   */
  async linkStudent(
    parentId: string, 
    studentId: string, 
    payload: { relationshipType: RelationshipType; isPrimaryGuardian: boolean; isEmergencyContact: boolean },
    auditUserId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const link = await tx.parentStudent.create({
        data: {
          parentId,
          studentId,
          relationshipType: payload.relationshipType,
          isPrimaryGuardian: payload.isPrimaryGuardian,
          isEmergencyContact: payload.isEmergencyContact,
          canReceiveNotifications: true
        }
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'LINK_STUDENT', entityType: 'PARENT', entityId: parentId }
      });

      return link;
    });
  }

  /**
   * Unlinks a parent from a student.
   */
  async unlinkStudent(parentId: string, studentId: string, auditUserId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.parentStudent.delete({
        where: {
          parentId_studentId: { parentId, studentId }
        }
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'UNLINK_STUDENT', entityType: 'PARENT', entityId: parentId }
      });

      return true;
    });
  }
  async getParents(schoolId: string, filters: any) {
    return prisma.parent.findMany({
      where: {
        schoolId,
        deletedAt: null,
        firstName: filters.name ? { contains: filters.name, mode: 'insensitive' } : undefined,
        primaryPhone: filters.phone ? { contains: filters.phone } : undefined,
      },
      include: {
        students: { include: { student: true } } // FIXED: Changed 'children' to 'students'
      }
    });
  }

  async updateParent(parentId: string, schoolId: string, payload: any, auditUserId: string) {
    return prisma.$transaction(async (tx) => {
      const parent = await tx.parent.update({
        where: { id: parentId, schoolId },
        data: payload
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'UPDATE', entityType: 'PARENT', entityId: parentId }
      });

      return parent;
    });
  }

  async deleteParent(parentId: string, schoolId: string, auditUserId: string) {
    return prisma.$transaction(async (tx) => {
      const parent = await tx.parent.update({
        where: { id: parentId, schoolId },
        data: { deletedAt: new Date() } // Soft Delete
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'SOFT_DELETE', entityType: 'PARENT', entityId: parentId }
      });

      return parent;
    });
  }
}