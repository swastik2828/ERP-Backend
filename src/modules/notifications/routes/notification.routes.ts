import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { AppError } from '../../../errors/AppError';
import { notificationController } from '../controllers/notification.controller';
import { notificationPreferenceController } from '../controllers/notification-preference.controller';
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  sendManualNotificationSchema,
} from '../validators/notification.validator';
import { updatePreferencesSchema } from '../validators/notification-preference.validator';

const router = Router();

// Notification-specific rate limiter to prevent aggressive polling
const notificationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError(
        'Too many notification requests, please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED'
      )
    );
  },
});

// All notification routes require authentication
router.use(requireAuth);
router.use(notificationRateLimiter);

// Specific routes before parameterized `:id` routes
router.get(
  '/',
  validateRequest(z.object({ query: getNotificationsQuerySchema })),
  notificationController.getNotifications
);

router.get('/unread-count', notificationController.getUnreadCount);

router.patch('/read-all', notificationController.markAllAsRead);

router.get(
  '/preferences',
  notificationPreferenceController.getPreferences
);

router.patch(
  '/preferences',
  validateRequest(z.object({ body: updatePreferencesSchema })),
  notificationPreferenceController.updatePreferences
);

router.post(
  '/manual',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER]),
  validateRequest(z.object({ body: sendManualNotificationSchema })),
  notificationController.sendManualNotification
);

// Parameterized routes
router.get(
  '/:id',
  validateRequest(z.object({ params: notificationIdParamSchema })),
  notificationController.getNotificationById
);

router.patch(
  '/:id/read',
  validateRequest(z.object({ params: notificationIdParamSchema })),
  notificationController.markAsRead
);

router.patch(
  '/:id/archive',
  validateRequest(z.object({ params: notificationIdParamSchema })),
  notificationController.archiveNotification
);

export default router;
