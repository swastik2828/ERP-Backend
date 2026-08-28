import { NotificationCategory, NotificationPriority } from '@prisma/client';
import { NotificationEventService } from '../services/notification-event.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { INotificationHandler } from '../handlers/handler.interface';

describe('NotificationEventService', () => {
  let service: NotificationEventService;
  let mockTemplateService: jest.Mocked<NotificationTemplateService>;
  let mockPreferenceService: jest.Mocked<NotificationPreferenceService>;
  let mockNotificationRepo: jest.Mocked<NotificationRepository>;
  let mockHandler: jest.Mocked<INotificationHandler>;

  beforeEach(() => {
    mockTemplateService = {
      render: jest.fn().mockResolvedValue({
        title: 'Rendered Title',
        body: 'Rendered Body',
      }),
      getTemplate: jest.fn(),
    } as unknown as jest.Mocked<NotificationTemplateService>;

    mockPreferenceService = {
      filterEligibleRecipients: jest.fn(),
      getUserPreferences: jest.fn(),
      updatePreferences: jest.fn(),
    } as unknown as jest.Mocked<NotificationPreferenceService>;

    mockNotificationRepo = {
      createManyInBatches: jest.fn().mockResolvedValue(1),
      findExistingRecipientIdsForEvent: jest.fn().mockResolvedValue(new Set()),
    } as unknown as jest.Mocked<NotificationRepository>;

    mockHandler = {
      canHandle: jest.fn().mockReturnValue(true),
      resolveTargets: jest.fn().mockResolvedValue([
        {
          recipientId: 'parent-user-1',
          context: { studentName: 'Rohan' },
          metadata: { studentId: 'student-1' },
        },
      ]),
    };

    service = new NotificationEventService(
      mockTemplateService,
      mockPreferenceService,
      mockNotificationRepo,
      [mockHandler]
    );
  });

  it('should process domain event and orchestrate resolution, preference filtering, rendering, and creation', async () => {
    const event: DomainEvent<any> = {
      eventId: 'evt-123',
      eventType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
      schoolId: 'school-1',
      entityType: 'ASSIGNMENT',
      entityId: 'assign-1',
      payload: {
        assignmentId: 'assign-1',
        title: 'Math HW',
      },
      occurredAt: new Date(),
    };

    mockPreferenceService.filterEligibleRecipients.mockResolvedValue([
      'parent-user-1',
    ]);

    const createdCount = await service.processEvent(event);

    expect(createdCount).toBe(1);
    expect(mockHandler.resolveTargets).toHaveBeenCalledWith(event);
    expect(mockPreferenceService.filterEligibleRecipients).toHaveBeenCalledWith(
      'school-1',
      ['parent-user-1'],
      NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
      false
    );
    expect(mockTemplateService.render).toHaveBeenCalledWith(
      NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
      { studentName: 'Rohan' },
      'school-1'
    );
    expect(mockNotificationRepo.createManyInBatches).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: 'school-1',
          recipientId: 'parent-user-1',
          type: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
          title: 'Rendered Title',
          body: 'Rendered Body',
          category: NotificationCategory.ACADEMIC,
          priority: NotificationPriority.NORMAL,
          isRead: false,
        }),
      ])
    );
  });

  it('should skip creating notifications if all recipients disabled the notification type', async () => {
    const event: DomainEvent<any> = {
      eventId: 'evt-123',
      eventType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
      schoolId: 'school-1',
      entityType: 'ASSIGNMENT',
      entityId: 'assign-1',
      payload: {},
      occurredAt: new Date(),
    };

    mockPreferenceService.filterEligibleRecipients.mockResolvedValue([]); // All opted out

    const createdCount = await service.processEvent(event);

    expect(createdCount).toBe(0);
    expect(mockNotificationRepo.createManyInBatches).not.toHaveBeenCalled();
  });
});
