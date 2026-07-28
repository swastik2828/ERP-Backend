import { NoticeStatus, Prisma } from '@prisma/client';
import prisma from '../../../database/prisma';

export class FeedService {
  async getPersonalizedFeed(user: { id: string; schoolId: string; role: string; classId?: string; sectionId?: string }, queryParams: any) {
    // BR-016: Feed Personalization & Target Audience Resolution
    const targetConditions: Prisma.NoticeTargetWhereInput[] = [
      { targetType: 'ALL' },
      { targetType: 'ROLE', targetRole: user.role as any },
      { targetType: 'INDIVIDUAL', targetUserId: user.id },
    ];

    if (user.classId) {
      targetConditions.push({ targetType: 'CLASS', targetClassId: user.classId });
    }
    if (user.sectionId) {
      targetConditions.push({ targetType: 'SECTION', targetSectionId: user.sectionId });
    }
    // Note: Parent/Teacher specific target resolution would be appended here based on user profile joins

    const where: Prisma.NoticeWhereInput = {
      schoolId: user.schoolId,
      status: NoticeStatus.PUBLISHED,
      deletedAt: null,
      targets: {
        some: {
          OR: targetConditions,
        },
      },
    };

    const notices = await prisma.notice.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { pinOrder: 'asc' },
        { publishedAt: 'desc' },
      ],
      skip: (Number(queryParams.page || 1) - 1) * Number(queryParams.pageSize || 20),
      take: Number(queryParams.pageSize || 20),
      include: {
        category: true,
        readReceipts: {
          where: { userId: user.id },
          select: { id: true }, // Just to check if read
        },
        acknowledgments: {
          where: { userId: user.id },
          select: { status: true },
        }
      },
    });

    return notices.map(notice => ({
      ...notice,
      isRead: notice.readReceipts.length > 0,
      acknowledgmentStatus: notice.acknowledgments[0]?.status || null,
      readReceipts: undefined, // clean up output
      acknowledgments: undefined,
    }));
  }
}