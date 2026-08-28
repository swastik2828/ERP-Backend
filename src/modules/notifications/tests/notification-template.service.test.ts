import { NotificationTemplateService } from '../services/notification-template.service';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { renderTemplate } from '../templates/notification.templates';

describe('NotificationTemplateService', () => {
  let service: NotificationTemplateService;
  let mockRepo: jest.Mocked<NotificationTemplateRepository>;

  beforeEach(() => {
    mockRepo = {
      findByType: jest.fn(),
      upsertTemplate: jest.fn(),
    } as unknown as jest.Mocked<NotificationTemplateRepository>;

    service = new NotificationTemplateService(mockRepo);
  });

  describe('renderTemplate utility', () => {
    it('should interpolate template placeholders correctly', () => {
      const template = 'Hello {{name}}, your balance is {{amount}} for {{month}}.';
      const context = { name: 'Alice', amount: '500', month: 'August' };

      const result = renderTemplate(template, context);
      expect(result).toBe('Hello Alice, your balance is 500 for August.');
    });

    it('should handle missing placeholders safely by replacing with empty string', () => {
      const template = 'Assignment {{title}} due on {{dueDate}}.';
      const context = { title: 'Algebra' };

      const result = renderTemplate(template, context);
      expect(result).toBe('Assignment Algebra due on .');
    });
  });

  describe('render', () => {
    it('should render default built-in template when no DB override exists', async () => {
      mockRepo.findByType.mockResolvedValue(null);

      const result = await service.render(
        NOTIFICATION_EVENT_TYPES.STUDENT_MARKED_ABSENT,
        {
          studentName: 'Rohan Sharma',
          date: '2026-08-19',
        },
        'school-1'
      );

      expect(result.title).toBe('Attendance Alert: Rohan Sharma Absent');
      expect(result.body).toContain('Rohan Sharma was marked absent on 2026-08-19.');
    });

    it('should use custom DB template if available for school', async () => {
      mockRepo.findByType.mockResolvedValue({
        id: 'tpl-1',
        schoolId: 'school-1',
        notificationType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
        titleTemplate: 'Custom: {{title}}',
        bodyTemplate: 'Special Homework: {{title}} for {{className}}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.render(
        NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
        {
          title: 'History Essay',
          className: 'Class 10-A',
        },
        'school-1'
      );

      expect(result.title).toBe('Custom: History Essay');
      expect(result.body).toBe('Special Homework: History Essay for Class 10-A');
    });
  });
});
