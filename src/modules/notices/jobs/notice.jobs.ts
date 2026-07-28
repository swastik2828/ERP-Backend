import cron from 'node-cron';
import prisma from '../../../database/prisma';
import { NoticeStatus } from '@prisma/client';

export class NoticeJobs {
  static initJobs() {
    // BR-005: NoticePublishJob - Runs every minute
    cron.schedule('* * * * *', async () => {
      try {
        const dueNotices = await prisma.notice.findMany({
          where: {
            status: NoticeStatus.SCHEDULED,
            publishAt: { lte: new Date() },
            deletedAt: null,
          },
        });

        for (const notice of dueNotices) {
          await prisma.notice.update({
            where: { id: notice.id },
            data: {
              status: NoticeStatus.PUBLISHED,
              publishedAt: new Date(),
            },
          });
          // Future enhancement: Trigger push notifications here
        }
      } catch (error) {
        console.error('Error in NoticePublishJob:', error);
      }
    });

    // BR-006: NoticeExpiryJob - Runs every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      try {
        const expiredNotices = await prisma.notice.findMany({
          where: {
            status: NoticeStatus.PUBLISHED,
            expiresAt: { lte: new Date() },
            deletedAt: null,
          },
        });

        for (const notice of expiredNotices) {
          await prisma.notice.update({
            where: { id: notice.id },
            data: {
              status: NoticeStatus.EXPIRED,
              archivedAt: new Date(),
            },
          });
        }
      } catch (error) {
        console.error('Error in NoticeExpiryJob:', error);
      }
    });

    // BR-015: NoticeCleanupJob - Runs Daily at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // Purge old audits
        await prisma.noticeAudit.deleteMany({
          where: { createdAt: { lte: oneYearAgo } },
        });

        // Purge old soft-deleted notices
        await prisma.notice.deleteMany({
          where: { deletedAt: { lte: oneYearAgo } },
        });

        // Purge old PII from read receipts
        await prisma.noticeReadReceipt.updateMany({
          where: { readAt: { lte: ninetyDaysAgo } },
          data: { ipAddress: null, userAgent: null },
        });
      } catch (error) {
        console.error('Error in NoticeCleanupJob:', error);
      }
    });
    
    console.log('Notice module background jobs initialized.');
  }
}