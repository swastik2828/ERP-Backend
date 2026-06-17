import prisma from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class SubjectRepository {
  static async create(data: Prisma.SubjectUncheckedCreateInput, tx: Prisma.TransactionClient = prisma) {
    return tx.subject.create({ data });
  }

  static async findById(id: string, schoolId: string, tx: Prisma.TransactionClient = prisma) {
    return tx.subject.findUnique({
      where: { id },
      ...((schoolId) && { where: { id, schoolId } }) 
    });
  }

  static async findByCode(code: string, schoolId: string, tx: Prisma.TransactionClient = prisma) {
    return tx.subject.findUnique({
      where: { schoolId_code: { schoolId, code } },
    });
  }

  static async update(id: string, _schoolId: string, data: Prisma.SubjectUpdateInput, tx: Prisma.TransactionClient = prisma) {
    return tx.subject.update({
      where: { id },
      data,
    });
  }

  static async findMany(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.SubjectWhereInput;
      orderBy?: Prisma.SubjectOrderByWithRelationInput;
    },
    tx: Prisma.TransactionClient = prisma
  ) {
    const { skip, take, where, orderBy } = params;
    const [data, total] = await Promise.all([
      tx.subject.findMany({ skip, take, where, orderBy }),
      tx.subject.count({ where }),
    ]);
    return { data, total };
  }

  static async createCurriculumMapping(data: Prisma.CurriculumMapUncheckedCreateInput, tx: Prisma.TransactionClient = prisma) {
    return tx.curriculumMap.create({ data });
  }

  static async findCurriculumMapping(academicSessionId: string, classId: string, subjectId: string, tx: Prisma.TransactionClient = prisma) {
    return tx.curriculumMap.findUnique({
      where: {
        academicSessionId_classId_subjectId: { academicSessionId, classId, subjectId },
      },
    });
  }

  static async deleteCurriculumMapping(id: string, _schoolId: string, tx: Prisma.TransactionClient = prisma) {
    return tx.curriculumMap.delete({
      where: { id },
    });
  }
}