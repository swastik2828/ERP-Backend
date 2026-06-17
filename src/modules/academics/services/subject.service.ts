import prisma from '../../../database/prisma';
import { SubjectRepository } from '../repositories/subject.repository';
import { SubjectType, SubjectCategory, SubjectStatus, Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';

interface CreateSubjectInput {
  name: string;
  code: string;
  shortName?: string;
  description?: string;
  subjectType: SubjectType;
  category: SubjectCategory;
  credits?: number;
  displayOrder: number;
}

export class SubjectService {
  static async createSubject(schoolId: string, actorId: string, data: CreateSubjectInput) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await SubjectRepository.findByCode(data.code, schoolId, tx);
      if (existing) {
        throw new AppError('A subject with this code already exists in your school.', 400);
      }

      const subject = await SubjectRepository.create({ ...data, schoolId }, tx);

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'Subject Created',
          entityType: 'Subject',
          entityId: subject.id,
        },
      });

      return subject;
    });
  }

  static async updateSubject(schoolId: string, actorId: string, subjectId: string, data: Partial<CreateSubjectInput>) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const subject = await SubjectRepository.findById(subjectId, schoolId, tx);
      if (!subject) throw new AppError('Subject not found', 404);

      const updatedSubject = await SubjectRepository.update(subjectId, schoolId, data, tx);

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'Subject Updated',
          entityType: 'Subject',
          entityId: subjectId,
        },
      });

      return updatedSubject;
    });
  }

  static async deactivateSubject(schoolId: string, actorId: string, subjectId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const subject = await SubjectRepository.findById(subjectId, schoolId, tx);
      if (!subject) throw new AppError('Subject not found', 404);

      const deactivatedSubject = await SubjectRepository.update(subjectId, schoolId, {
        status: SubjectStatus.INACTIVE,
        deletedAt: new Date(),
      }, tx);

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'Subject Deactivated',
          entityType: 'Subject',
          entityId: subjectId,
        },
      });

      return deactivatedSubject;
    });
  }

  static async listSubjects(schoolId: string, query: any) {
    const { page = 1, limit = 10, search, subjectType, category, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SubjectWhereInput = {
      schoolId, 
      ...(subjectType && { subjectType }),
      ...(category && { category }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { shortName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.SubjectOrderByWithRelationInput = sortBy 
      ? { [sortBy as string]: (sortOrder as Prisma.SortOrder) || 'asc' } 
      : { displayOrder: 'asc' };

    return SubjectRepository.findMany({ skip, take: limit, where, orderBy });
  }

  static async addCurriculumMapping(schoolId: string, actorId: string, data: { academicSessionId: string, classId: string, subjectId: string, isMandatory: boolean }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await SubjectRepository.findCurriculumMapping(data.academicSessionId, data.classId, data.subjectId, tx);
      if (existing) {
        throw new AppError('This subject is already mapped to this class for the selected academic session.', 400);
      }

      const mapping = await SubjectRepository.createCurriculumMapping({
        ...data,
        schoolId,
      }, tx);

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'Curriculum Mapping Added',
          entityType: 'CurriculumMap',
          entityId: mapping.id,
        },
      });

      return mapping;
    });
  }

  static async removeCurriculumMapping(schoolId: string, actorId: string, mappingId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const mapping = await SubjectRepository.deleteCurriculumMapping(mappingId, schoolId, tx);

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'Curriculum Mapping Removed',
          entityType: 'CurriculumMap',
          entityId: mappingId,
        },
      });

      return mapping;
    });
  }
}