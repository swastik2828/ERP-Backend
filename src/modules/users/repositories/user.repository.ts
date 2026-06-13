import { Prisma, User } from '@prisma/client';
import prisma from '../../../database/prisma';

export class UserRepository {
  async create(data: Prisma.UserCreateInput | Prisma.UserUncheckedCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async findById(id: string, schoolId?: string | null): Promise<User | null> {
    const where: Prisma.UserWhereInput = { id };
    // Strict Tenant Isolation at DB level
    if (schoolId) where.schoolId = schoolId;
    
    return prisma.user.findFirst({ where });
  }

  async findMany(
    schoolId: string | null,
    params: { skip: number; take: number; where: Prisma.UserWhereInput }
  ): Promise<{ data: User[]; total: number }> {
    
    // Force tenant isolation
    if (schoolId) params.where.schoolId = schoolId;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip: params.skip,
        take: params.take,
        where: params.where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          accountStatus: true,
          lastLoginAt: true,
          createdAt: true,
          schoolId: true,
        }
      }),
      prisma.user.count({ where: params.where }),
    ]);

    // Explicit cast needed because we excluded passwordHash in the select
    return { data: data as unknown as User[], total };
  }

  async update(id: string, schoolId: string | null, data: Prisma.UserUpdateInput): Promise<User> {
    const where: Prisma.UserWhereUniqueInput = { id };
    
    // Before updating, verify tenant ownership
    if (schoolId) {
      const exists = await prisma.user.findFirst({ where: { id, schoolId } });
      if (!exists) throw new Error('TENANT_VIOLATION');
    }

    return prisma.user.update({ where, data });
  }
}