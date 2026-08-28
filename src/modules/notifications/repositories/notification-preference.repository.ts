import { NotificationPreference } from '@prisma/client';
import prisma from '../../../database/prisma';
import { PreferenceItemDto } from '../dtos/notification-preference.dto';

export class NotificationPreferenceRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  public async findByUserId(userId: string): Promise<NotificationPreference[]> {
    return this.db.notificationPreference.findMany({
      where: { userId },
    });
  }

  public async findByUserIdAndType(
    userId: string,
    notificationType: string
  ): Promise<NotificationPreference | null> {
    return this.db.notificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId,
          notificationType,
        },
      },
    });
  }

  public async findDisabledUserIdsForType(
    userIds: string[],
    notificationType: string
  ): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();

    const disabledPrefs = await this.db.notificationPreference.findMany({
      where: {
        userId: { in: userIds },
        notificationType,
        enabled: false,
      },
      select: { userId: true },
    });

    return new Set(disabledPrefs.map((p) => p.userId));
  }

  public async upsertPreference(
    userId: string,
    notificationType: string,
    enabled: boolean
  ): Promise<NotificationPreference> {
    return this.db.notificationPreference.upsert({
      where: {
        userId_notificationType: {
          userId,
          notificationType,
        },
      },
      update: {
        enabled,
      },
      create: {
        userId,
        notificationType,
        enabled,
      },
    });
  }

  public async bulkUpsertPreferences(
    userId: string,
    preferences: PreferenceItemDto[]
  ): Promise<NotificationPreference[]> {
    const results: NotificationPreference[] = [];

    await this.db.$transaction(async (tx) => {
      for (const pref of preferences) {
        const updated = await tx.notificationPreference.upsert({
          where: {
            userId_notificationType: {
              userId,
              notificationType: pref.notificationType,
            },
          },
          update: {
            enabled: pref.enabled,
          },
          create: {
            userId,
            notificationType: pref.notificationType,
            enabled: pref.enabled,
          },
        });
        results.push(updated);
      }
    });

    return results;
  }
}

export const notificationPreferenceRepository =
  new NotificationPreferenceRepository();
