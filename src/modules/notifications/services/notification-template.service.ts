import { DEFAULT_TEMPLATES, renderTemplate, TemplateDefinition } from '../templates/notification.templates';
import { NotificationTemplateRepository, notificationTemplateRepository } from '../repositories/notification-template.repository';

export class NotificationTemplateService {
  constructor(
    private readonly templateRepo: NotificationTemplateRepository = notificationTemplateRepository
  ) {}

  public async getTemplate(
    notificationType: string,
    schoolId?: string
  ): Promise<TemplateDefinition> {
    try {
      const dbTemplate = await this.templateRepo.findByType(notificationType, schoolId);
      if (dbTemplate) {
        return {
          titleTemplate: dbTemplate.titleTemplate,
          bodyTemplate: dbTemplate.bodyTemplate,
        };
      }
    } catch {
      // Fallback to default in-code templates if DB query fails
    }

    const defaultTpl = DEFAULT_TEMPLATES[notificationType];
    if (defaultTpl) {
      return defaultTpl;
    }

    return {
      titleTemplate: `Notification: ${notificationType}`,
      bodyTemplate: 'You have received a new notification.',
    };
  }

  public async render(
    notificationType: string,
    context: Record<string, unknown>,
    schoolId?: string
  ): Promise<{ title: string; body: string }> {
    const template = await this.getTemplate(notificationType, schoolId);
    return {
      title: renderTemplate(template.titleTemplate, context),
      body: renderTemplate(template.bodyTemplate, context),
    };
  }
}

export const notificationTemplateService = new NotificationTemplateService();
