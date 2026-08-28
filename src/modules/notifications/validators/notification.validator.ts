import { z } from 'zod';
import { NotificationCategory, NotificationPriority, Role } from '@prisma/client';

export const getNotificationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (!val) return 20;
      const parsed = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(parsed) ? 20 : Math.min(Math.max(parsed, 1), 100);
    }),
  unread: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return undefined;
    }),
  category: z.nativeEnum(NotificationCategory).optional(),
  type: z.string().optional(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid('Notification ID must be a valid UUID'),
});

export const sendManualNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  body: z.string().min(1, 'Body is required').max(2000),
  category: z.nativeEnum(NotificationCategory),
  priority: z.nativeEnum(NotificationPriority).optional().default(NotificationPriority.NORMAL),
  recipientIds: z.array(z.string().uuid()).optional(),
  roles: z.array(z.nativeEnum(Role)).optional(),
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.string().datetime().optional(),
});
