import { Prisma, Notice, NoticeType } from '@prisma/client';
import prisma from '../../../database/prisma';

export class NoticeRepository {
  async create(data: Prisma.NoticeCreateInput): Promise<Notice> {
    return prisma.notice.create({ data, include: { targets: true } });
  }

  async findById(id: string, schoolId: string): Promise<Notice | null> {
    return prisma.notice.findFirst({
      where: { id, schoolId, deletedAt: null },
      include: {
        targets: true,
        attachments: true,
        category: true,
        // FIX: Changed firstName/lastName to fullName based on your User schema
        creator: { select: { id: true, fullName: true } },
      },
    });
  }

  async findMany(where: Prisma.NoticeWhereInput, skip?: number, take?: number, orderBy?: Prisma.NoticeOrderByWithRelationInput): Promise<[Notice[], number]> {
    return prisma.$transaction([
      prisma.notice.findMany({
        where: { ...where, deletedAt: null }, skip, take, orderBy, include: { category: true, targets: true },
      }),
      prisma.notice.count({ where: { ...where, deletedAt: null } }),
    ]);
  }

  async update(id: string, data: Prisma.NoticeUpdateInput): Promise<Notice> {
    return prisma.notice.update({
      where: { id },
      data,
    });
  }

  async checkDuplicate(schoolId: string, title: string, type: NoticeType, withinHours: number = 24): Promise<boolean> {
    const timeThreshold = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    const count = await prisma.notice.count({
      where: { schoolId, title: { equals: title, mode: 'insensitive' }, type, createdAt: { gte: timeThreshold }, deletedAt: null },
    });
    return count > 0;
  }

  async countPinnedNotices(schoolId: string): Promise<number> {
    return prisma.notice.count({
      where: { schoolId, isPinned: true, deletedAt: null },
    });
  }
}