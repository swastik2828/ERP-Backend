import { NotificationTemplate } from '@prisma/client';
import prisma from '../../../database/prisma';

export class NotificationTemplateRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  public async findByType(
    notificationType: string,
    schoolId?: string
  ): Promise<NotificationTemplate | null> {
    if (schoolId) {
      const customTemplate = await this.db.notificationTemplate.findFirst({
        where: {
          notificationType,
          schoolId,
        },
      });
      if (customTemplate) {
        return customTemplate;
      }
    }

    return this.db.notificationTemplate.findUnique({
      where: {
        notificationType,
      },
    });
  }

  public async upsertTemplate(data: {
    schoolId?: string;
    notificationType: string;
    titleTemplate: string;
    bodyTemplate: string;
  }): Promise<NotificationTemplate> {
    return this.db.notificationTemplate.upsert({
      where: {
        notificationType: data.notificationType,
      },
      update: {
        schoolId: data.schoolId,
        titleTemplate: data.titleTemplate,
        bodyTemplate: data.bodyTemplate,
      },
      create: {
        schoolId: data.schoolId,
        notificationType: data.notificationType,
        titleTemplate: data.titleTemplate,
        bodyTemplate: data.bodyTemplate,
      },
    });
  }
}

export const notificationTemplateRepository =
  new NotificationTemplateRepository();
