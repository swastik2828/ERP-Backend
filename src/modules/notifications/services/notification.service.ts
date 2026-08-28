import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';
import {
  GetNotificationsQueryDto,
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
  SendManualNotificationDto,
  UnreadCountResponseDto,
} from '../dtos/notification.dto';
import { NOTIFICATION_CONFIG, NOTIFICATION_ERROR_CODES, NOTIFICATION_EVENT_TYPES } from '../constants/notification.constants';
import { NotificationRepository, notificationRepository } from '../repositories/notification.repository';
import { NotificationRecipientService, notificationRecipientService } from './notification-recipient.service';
import { NotificationPreferenceService, notificationPreferenceService } from './notification-preference.service';

export class NotificationService {
  constructor(
    private readonly notificationRepo: NotificationRepository = notificationRepository,
    private readonly recipientService: NotificationRecipientService = notificationRecipientService,
    private readonly preferenceService: NotificationPreferenceService = notificationPreferenceService
  ) {}

  public async getNotifications(
    schoolId: string,
    recipientId: string,
    query: GetNotificationsQueryDto
  ): Promise<PaginatedNotificationsResponseDto> {
    const { items, nextCursor, hasMore } =
      await this.notificationRepo.findManyWithCursor({
        schoolId,
        recipientId,
        cursor: query.cursor,
        limit: query.limit ?? NOTIFICATION_CONFIG.DEFAULT_PAGE_LIMIT,
        unread: query.unread,
        category: query.category,
        type: query.type,
      });

    const formattedNotifications: NotificationResponseDto[] = items.map((item) => ({
      id: item.id,
      schoolId: item.schoolId,
      recipientId: item.recipientId,
      type: item.type,
      category: item.category,
      title: item.title,
      body: item.body,
      entityType: item.entityType,
      entityId: item.entityId,
      metadata: item.metadata as Record<string, unknown> | null,
      priority: item.priority,
      isRead: item.isRead,
      readAt: item.readAt,
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      notifications: formattedNotifications,
      pagination: {
        nextCursor,
        hasMore,
        limit: query.limit ?? NOTIFICATION_CONFIG.DEFAULT_PAGE_LIMIT,
      },
    };
  }

  public async getNotificationById(
    id: string,
    schoolId: string,
    recipientId: string
  ): Promise<NotificationResponseDto> {
    const item = await this.notificationRepo.findByIdAndRecipient(
      id,
      schoolId,
      recipientId
    );

    if (!item) {
      throw new AppError(
        'Notification not found',
        404,
        NOTIFICATION_ERROR_CODES.NOTIFICATION_NOT_FOUND
      );
    }

    return {
      id: item.id,
      schoolId: item.schoolId,
      recipientId: item.recipientId,
      type: item.type,
      category: item.category,
      title: item.title,
      body: item.body,
      entityType: item.entityType,
      entityId: item.entityId,
      metadata: item.metadata as Record<string, unknown> | null,
      priority: item.priority,
      isRead: item.isRead,
      readAt: item.readAt,
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  public async getUnreadCount(
    schoolId: string,
    recipientId: string
  ): Promise<UnreadCountResponseDto> {
    const count = await this.notificationRepo.countUnread(schoolId, recipientId);
    return { count };
  }

  public async markAsRead(
    id: string,
    schoolId: string,
    recipientId: string
  ): Promise<{ success: boolean; isRead: boolean }> {
    // Check if notification exists first for IDOR defense
    const existing = await this.notificationRepo.findByIdAndRecipient(
      id,
      schoolId,
      recipientId
    );

    if (!existing) {
      throw new AppError(
        'Notification not found',
        404,
        NOTIFICATION_ERROR_CODES.NOTIFICATION_NOT_FOUND
      );
    }

    if (!existing.isRead) {
      await this.notificationRepo.markAsRead(id, schoolId, recipientId);
    }

    return { success: true, isRead: true };
  }

  public async markAllAsRead(
    schoolId: string,
    recipientId: string
  ): Promise<{ updatedCount: number }> {
    const updatedCount = await this.notificationRepo.markAllAsRead(
      schoolId,
      recipientId
    );
    return { updatedCount };
  }

  public async archiveNotification(
    id: string,
    schoolId: string,
    recipientId: string
  ): Promise<{ success: boolean }> {
    const existing = await this.notificationRepo.findByIdAndRecipient(
      id,
      schoolId,
      recipientId
    );

    if (!existing) {
      throw new AppError(
        'Notification not found',
        404,
        NOTIFICATION_ERROR_CODES.NOTIFICATION_NOT_FOUND
      );
    }

    await this.notificationRepo.archive(id, schoolId, recipientId);
    return { success: true };
  }

  public async sendManualNotification(
    schoolId: string,
    senderId: string,
    dto: SendManualNotificationDto
  ): Promise<{ createdCount: number }> {
    const targetUserIds = new Set<string>();

    if (dto.recipientIds && dto.recipientIds.length > 0) {
      dto.recipientIds.forEach((id) => targetUserIds.add(id));
    }

    if (dto.roles && dto.roles.length > 0) {
      const usersWithRoles = await this.recipientService.resolveUsersByRoles(
        schoolId,
        dto.roles
      );
      usersWithRoles.forEach((id) => targetUserIds.add(id));
    }

    if (dto.classId) {
      const students = await this.recipientService.resolveStudentsInClass(
        schoolId,
        dto.classId,
        dto.sectionId
      );
      const studentIds = students.map((s) => s.id);
      const parents = await this.recipientService.resolveParentsOfStudents(
        schoolId,
        studentIds
      );
      parents.forEach((p) => targetUserIds.add(p.parentUserId));
    }

    const uniqueRecipientIds = Array.from(targetUserIds);
    if (uniqueRecipientIds.length === 0) {
      return { createdCount: 0 };
    }

    // Filter by preferences
    const eligibleRecipients = await this.preferenceService.filterEligibleRecipients(
      schoolId,
      uniqueRecipientIds,
      NOTIFICATION_EVENT_TYPES.SYSTEM_ANNOUNCEMENT,
      false
    );

    const now = new Date();
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(now.getTime() + NOTIFICATION_CONFIG.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const notifications: Prisma.NotificationCreateManyInput[] = eligibleRecipients.map(
      (recipientId) => ({
        schoolId,
        recipientId,
        type: NOTIFICATION_EVENT_TYPES.SYSTEM_ANNOUNCEMENT,
        category: dto.category,
        title: dto.title,
        body: dto.body,
        priority: dto.priority ?? 'NORMAL',
        metadata: {
          senderId,
          ...(dto.metadata || {}),
        } as Prisma.InputJsonValue,
        isRead: false,
        expiresAt,
      })
    );

    const createdCount = await this.notificationRepo.createManyInBatches(
      notifications
    );

    return { createdCount };
  }
}

export const notificationService = new NotificationService();
