import cron from 'node-cron';
import prisma from '../../../database/prisma';
import { AssignmentStatus } from '@prisma/client';

export class AssignmentJobs {
  /**
   * Initializes all background workers for the homework module.
   */
  public static initJobs() {
    this.scheduleAutoPublish();
    this.scheduleAutoClose();
  }

  /**
   * Runs every 5 minutes.
   * Finds all SCHEDULED assignments where publishAt <= now,
   * and transitions them to PUBLISHED.
   */
  private static scheduleAutoPublish() {
    cron.schedule('*/5 * * * *', async () => {
      console.log('[CRON] Running Auto-Publish Job...');
      try {
        const now = new Date();

        const result = await prisma.assignment.updateMany({
          where: {
            status: AssignmentStatus.SCHEDULED,
            publishAt: {
              lte: now,
            },
            deletedAt: null,
          },
          data: {
            status: AssignmentStatus.PUBLISHED,
            publishedAt: now,
            updatedAt: now,
          },
        });

        if (result.count > 0) {
          console.log(`[CRON] Successfully auto-published ${result.count} assignments.`);
          // Extensibility: Trigger event bus here to dispatch push notifications to students
          // EventBus.emit('assignments.auto_published', { timestamp: now });
        }
      } catch (error) {
        console.error('[CRON] Error in Auto-Publish Job:', error);
      }
    });
  }

  /**
   * Runs every hour.
   * Finds all PUBLISHED/ACTIVE assignments where dueDate + gracePeriod < now,
   * and transitions them to CLOSED to prevent further submissions.
   */
  private static scheduleAutoClose() {
    cron.schedule('0 * * * *', async () => {
      console.log('[CRON] Running Auto-Close Job...');
      try {
        const now = new Date();

        // Note: In PostgreSQL, adding hours from a column to a datetime requires a raw query
        // or a two-step fetch-and-update process in Prisma. 
        // For simplicity, here is the fetch-and-update approach.
        
        const expiredAssignments = await prisma.assignment.findMany({
          where: {
            status: { in: [AssignmentStatus.PUBLISHED, AssignmentStatus.ACTIVE] },
            deletedAt: null,
          },
          select: { id: true, dueDate: true, gracePeriodHours: true }
        });

        const idsToClose = expiredAssignments
          .filter(a => {
            const closingTime = new Date(a.dueDate);
            closingTime.setHours(closingTime.getHours() + a.gracePeriodHours);
            return now > closingTime;
          })
          .map(a => a.id);

        if (idsToClose.length > 0) {
          const result = await prisma.assignment.updateMany({
            where: { id: { in: idsToClose } },
            data: {
              status: AssignmentStatus.CLOSED,
              updatedAt: now,
            },
          });
          console.log(`[CRON] Successfully auto-closed ${result.count} assignments.`);
        }
      } catch (error) {
        console.error('[CRON] Error in Auto-Close Job:', error);
      }
    });
  }
}