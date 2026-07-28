import prisma from '../../../database/prisma';

export class AnalyticsService {
  async getNoticeReadReceipts(schoolId: string, noticeId: string, page = 1, pageSize = 20) {
    return prisma.noticeReadReceipt.findMany({
      where: { schoolId, noticeId },
      // FIX: Changed firstName/lastName to fullName based on your User schema
      include: { user: { select: { id: true, fullName: true, role: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { readAt: 'desc' }
    });
  }

  async getNoticeAcknowledgments(schoolId: string, noticeId: string, page = 1, pageSize = 20) {
    return prisma.noticeAcknowledgment.findMany({
      where: { schoolId, noticeId },
      // FIX: Changed firstName/lastName to fullName based on your User schema
      include: { user: { select: { id: true, fullName: true, role: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { acknowledgedAt: 'desc' }
    });
  }

  async getDashboardStats(schoolId: string) {
    const [totalNotices, activeCirculars, totalReads, totalAcks] = await Promise.all([
      prisma.notice.count({ where: { schoolId, deletedAt: null } }),
      prisma.notice.count({ where: { schoolId, type: 'CIRCULAR', status: 'PUBLISHED', deletedAt: null } }),
      prisma.noticeReadReceipt.count({ where: { schoolId } }),
      prisma.noticeAcknowledgment.count({ where: { schoolId, status: 'ACKNOWLEDGED' } })
    ]);

    return { totalNotices, activeCirculars, totalReads, totalAcks };
  }
}