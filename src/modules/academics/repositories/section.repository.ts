import { Prisma, Section } from '@prisma/client';
import prisma from '../../../database/prisma';

export class SectionRepository {
  async create(data: Prisma.SectionUncheckedCreateInput): Promise<Section> {
    return prisma.section.create({ data });
  }

  async findById(id: string, schoolId: string): Promise<Section | null> {
    // Tenant isolation enforced implicitly by joining the Class model
    return prisma.section.findFirst({ 
      where: { id, status: { not: 'ARCHIVED' }, class: { schoolId } } 
    });
  }

  async findByNameAndClass(name: string, classId: string) {
    return prisma.section.findFirst({
      where: { name, classId, status: { not: 'ARCHIVED' } }
    });
  }

  async findMany(schoolId: string, params: { skip: number; take: number; classId?: string; search?: string; status?: any }) {
    const where: Prisma.SectionWhereInput = { 
      status: params.status || { not: 'ARCHIVED' },
      class: { schoolId } 
    };
    
    if (params.classId) where.classId = params.classId;
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.section.findMany({
        skip: params.skip,
        take: params.take,
        where,
        orderBy: { name: 'asc' },
        include: {
          class: { select: { name: true } },
          assignments: {
            where: { endDate: null }, // Fetch only currently active teachers
            include: { teacher: { select: { fullName: true } } }
          }
        }
      }),
      prisma.section.count({ where })
    ]);

    return { data, total };
  }

  async update(id: string, data: Prisma.SectionUpdateInput): Promise<Section> {
    return prisma.section.update({ where: { id }, data });
  }
}