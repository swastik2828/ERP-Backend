import { NotificationEventService } from '../services/notification-event.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationTemplateService } from '../services/notification-template.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { DomainEvent } from '../../../infrastructure/events/event.interface';
import { INotificationHandler } from '../handlers/handler.interface';

describe('Notification Idempotency Tests (PRD Section 12 & 53)', () => {
  let service: NotificationEventService;
  let mockRepo: jest.Mocked<NotificationRepository>;
  let mockTemplateService: jest.Mocked<NotificationTemplateService>;
  let mockPrefService: jest.Mocked<NotificationPreferenceService>;
  let mockHandler: jest.Mocked<INotificationHandler>;

  beforeEach(() => {
    mockRepo = {
      findExistingRecipientIdsForEvent: jest.fn(),
      createManyInBatches: jest.fn(),
    } as unknown as jest.Mocked<NotificationRepository>;

    mockTemplateService = {
      render: jest.fn().mockResolvedValue({
        title: 'Assignment',
        body: 'Assignment body',
      }),
    } as unknown as jest.Mocked<NotificationTemplateService>;

    mockPrefService = {
      filterEligibleRecipients: jest.fn().mockImplementation((_school, ids) => Promise.resolve(ids)),
    } as unknown as jest.Mocked<NotificationPreferenceService>;

    mockHandler = {
      canHandle: jest.fn().mockReturnValue(true),
      resolveTargets: jest.fn().mockResolvedValue([
        {
          recipientId: 'parent-1',
          context: {},
        },
      ]),
    };

    service = new NotificationEventService(
      mockTemplateService,
      mockPrefService,
      mockRepo,
      [mockHandler]
    );
  });

  it('should process event first time and create notification', async () => {
    const event: DomainEvent<any> = {
      eventId: 'evt-unique-1',
      eventType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
      schoolId: 'school-1',
      entityType: 'ASSIGNMENT',
      entityId: 'assign-1',
      payload: { assignmentId: 'assign-1' },
      occurredAt: new Date(),
    };

    // First run: no existing notifications
    mockRepo.findExistingRecipientIdsForEvent.mockResolvedValue(new Set());
    mockRepo.createManyInBatches.mockResolvedValue(1);

    const firstRunCount = await service.processEvent(event);
    expect(firstRunCount).toBe(1);
    expect(mockRepo.createManyInBatches).toHaveBeenCalledTimes(1);
  });

  it('should prevent duplicate notifications when exact same event is re-processed', async () => {
    const event: DomainEvent<any> = {
      eventId: 'evt-unique-1',
      eventType: NOTIFICATION_EVENT_TYPES.ASSIGNMENT_PUBLISHED,
      schoolId: 'school-1',
      entityType: 'ASSIGNMENT',
      entityId: 'assign-1',
      payload: { assignmentId: 'assign-1' },
      occurredAt: new Date(),
    };

    // Second run: parent-1 already received notification for this entity
    mockRepo.findExistingRecipientIdsForEvent.mockResolvedValue(new Set(['parent-1']));

    const secondRunCount = await service.processEvent(event);
    expect(secondRunCount).toBe(0);
    expect(mockRepo.createManyInBatches).not.toHaveBeenCalled();
  });
});
