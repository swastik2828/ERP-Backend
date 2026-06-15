import { Prisma, Class } from '@prisma/client';
import prisma from '../../../database/prisma';

export class ClassRepository {
  async create(data: Prisma.ClassUncheckedCreateInput): Promise<Class> {
    return prisma.class.create({ data });
  }

  async findById(id: string, schoolId: string): Promise<Class | null> {
    return prisma.class.findFirst({ 
      where: { id, schoolId, status: { not: 'ARCHIVED' } } 
    });
  }
  
  async findByNameAndSession(name: string, academicSessionId: string, schoolId: string) {
    return prisma.class.findFirst({
        where: { name, academicSessionId, schoolId, status: { not: 'ARCHIVED' } }
    });
  }

  async findMany(schoolId: string, params: { skip: number; take: number; academicSessionId?: string; search?: string; status?: any }) {
    const where: Prisma.ClassWhereInput = { schoolId, status: params.status || { not: 'ARCHIVED' } };
    
    if (params.academicSessionId) where.academicSessionId = params.academicSessionId;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const [data, total] = await Promise.all([
      prisma.class.findMany({
        skip: params.skip,
        take: params.take,
        where,
        orderBy: { displayOrder: 'asc' },
        include: { _count: { select: { sections: true } } }
      }),
      prisma.class.count({ where })
    ]);

    return { data, total };
  }

  async update(id: string, schoolId: string, data: Prisma.ClassUpdateInput): Promise<Class> {
    const existing = await prisma.class.findFirst({ where: { id, schoolId } });
    if (!existing) throw new Error('NOT_FOUND');
    return prisma.class.update({ where: { id }, data });
  }
}