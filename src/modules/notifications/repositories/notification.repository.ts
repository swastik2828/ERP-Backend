import { Notification, NotificationCategory, Prisma } from '@prisma/client';
import prisma from '../../../database/prisma';
import { NOTIFICATION_CONFIG } from '../constants/notification.constants';

export interface FindNotificationsOptions {
  schoolId: string;
  recipientId: string;
  cursor?: string;
  limit?: number;
  unread?: boolean;
  category?: NotificationCategory;
  type?: string;
}

export interface CursorPayload {
  createdAt: string;
  id: string;
}

export class NotificationRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  public encodeCursor(payload: CursorPayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  public decodeCursor(cursorStr: string): CursorPayload | null {
    try {
      const decoded = Buffer.from(cursorStr, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.createdAt && parsed.id) {
        return parsed as CursorPayload;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async findManyWithCursor(options: FindNotificationsOptions): Promise<{
    items: Notification[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const limit = options.limit ?? NOTIFICATION_CONFIG.DEFAULT_PAGE_LIMIT;
    const where: Prisma.NotificationWhereInput = {
      schoolId: options.schoolId,
      recipientId: options.recipientId,
    };

    if (options.unread !== undefined) {
      where.isRead = !options.unread;
    }

    if (options.category) {
      where.category = options.category;
    }

    if (options.type) {
      where.type = options.type;
    }

    if (options.cursor) {
      const decoded = this.decodeCursor(options.cursor);
      if (decoded) {
        const cursorDate = new Date(decoded.createdAt);
        where.OR = [
          { createdAt: { lt: cursorDate } },
          {
            createdAt: cursorDate,
            id: { lt: decoded.id },
          },
        ];
      }
    }

    const items = await this.db.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;

    let nextCursor: string | null = null;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = this.encodeCursor({
        createdAt: lastItem.createdAt.toISOString(),
        id: lastItem.id,
      });
    }

    return {
      items: results,
      nextCursor,
      hasMore,
    };
  }

  public async findByIdAndRecipient(
    id: string,
    schoolId: string,
    recipientId: string
  ): Promise<Notification | null> {
    return this.db.notification.findFirst({
      where: {
        id,
        schoolId,
        recipientId,
      },
    });
  }

  public async countUnread(
    schoolId: string,
    recipientId: string
  ): Promise<number> {
    return this.db.notification.count({
      where: {
        schoolId,
        recipientId,
        isRead: false,
      },
    });
  }

  public async markAsRead(
    id: string,
    schoolId: string,
    recipientId: string
  ): Promise<number> {
    const result = await this.db.notification.updateMany({
      where: {
        id,
        schoolId,
        recipientId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  public async markAllAsRead(
    schoolId: string,
    recipientId: string
  ): Promise<number> {
    const result = await this.db.notification.updateMany({
      where: {
        schoolId,
        recipientId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  public async archive(
    id: string,
    schoolId: string,
    recipientId: string
  ): Promise<number> {
    const result = await this.db.notification.deleteMany({
      where: {
        id,
        schoolId,
        recipientId,
      },
    });
    return result.count;
  }

  public async createManyInBatches(
    notifications: Prisma.NotificationCreateManyInput[],
    chunkSize: number = NOTIFICATION_CONFIG.BATCH_INSERT_CHUNK_SIZE
  ): Promise<number> {
    if (notifications.length === 0) return 0;

    let totalCreated = 0;
    for (let i = 0; i < notifications.length; i += chunkSize) {
      const chunk = notifications.slice(i, i + chunkSize);
      const result = await this.db.notification.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      totalCreated += result.count;
    }

    return totalCreated;
  }

  public async findExistingRecipientIdsForEvent(
    schoolId: string,
    entityType: string,
    entityId: string,
    type: string
  ): Promise<Set<string>> {
    const existing = await this.db.notification.findMany({
      where: {
        schoolId,
        entityType,
        entityId,
        type,
      },
      select: {
        recipientId: true,
      },
    });

    return new Set(existing.map((n) => n.recipientId));
  }

  public async deleteExpiredAndOldRead(
    readRetentionCutoff: Date,
    now: Date
  ): Promise<number> {
    const result = await this.db.notification.deleteMany({
      where: {
        OR: [
          {
            isRead: true,
            readAt: { lte: readRetentionCutoff },
          },
          {
            expiresAt: { lte: now },
          },
        ],
      },
    });
    return result.count;
  }
}

export const notificationRepository = new NotificationRepository();
