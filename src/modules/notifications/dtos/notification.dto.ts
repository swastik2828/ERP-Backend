import { NotificationCategory, NotificationPriority, Role } from '@prisma/client';

export interface GetNotificationsQueryDto {
  cursor?: string;
  limit?: number;
  unread?: boolean;
  category?: NotificationCategory;
  type?: string;
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface NotificationResponseDto {
  id: string;
  schoolId: string;
  recipientId: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedNotificationsResponseDto {
  notifications: NotificationResponseDto[];
  pagination: CursorPaginationMeta;
}

export interface UnreadCountResponseDto {
  count: number;
}

export interface SendManualNotificationDto {
  title: string;
  body: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  recipientIds?: string[];
  roles?: Role[];
  classId?: string;
  sectionId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}
