import { Request, Response, NextFunction } from 'express';
import { NotificationService, notificationService } from '../services/notification.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';
import { NOTIFICATION_ERROR_CODES } from '../constants/notification.constants';
import { GetNotificationsQueryDto, SendManualNotificationDto } from '../dtos/notification.dto';

export class NotificationController {
  constructor(
    private readonly service: NotificationService = notificationService
  ) {}

  private extractUser(req: Request) {
    if (!req.user || !req.user.id || !req.user.schoolId) {
      throw new AppError(
        'User not authenticated or missing tenant context',
        401,
        NOTIFICATION_ERROR_CODES.UNAUTHORIZED_NOTIFICATION_ACCESS
      );
    }
    return {
      userId: req.user.id,
      schoolId: req.user.schoolId,
      role: req.user.role,
    };
  }

  public getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const query = req.query as unknown as GetNotificationsQueryDto;

      const result = await this.service.getNotifications(
        user.schoolId,
        user.userId,
        query
      );

      sendSuccess(
        res,
        200,
        result.notifications,
        'Notifications retrieved successfully',
        result.pagination as unknown as Record<string, unknown>
      );
    } catch (error) {
      next(error);
    }
  };

  public getNotificationById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const id = req.params.id as string;

      const notification = await this.service.getNotificationById(
        id,
        user.schoolId,
        user.userId
      );

      sendSuccess(res, 200, notification, 'Notification details retrieved');
    } catch (error) {
      next(error);
    }
  };

  public getUnreadCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const result = await this.service.getUnreadCount(
        user.schoolId,
        user.userId
      );

      sendSuccess(res, 200, result, 'Unread notification count retrieved');
    } catch (error) {
      next(error);
    }
  };

  public markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const id = req.params.id as string;

      const result = await this.service.markAsRead(
        id,
        user.schoolId,
        user.userId
      );

      sendSuccess(res, 200, result, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  };

  public markAllAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const result = await this.service.markAllAsRead(
        user.schoolId,
        user.userId
      );

      sendSuccess(
        res,
        200,
        result,
        `Marked ${result.updatedCount} notifications as read`
      );
    } catch (error) {
      next(error);
    }
  };

  public archiveNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const id = req.params.id as string;

      const result = await this.service.archiveNotification(
        id,
        user.schoolId,
        user.userId
      );

      sendSuccess(res, 200, result, 'Notification archived successfully');
    } catch (error) {
      next(error);
    }
  };

  public sendManualNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const body = req.body as SendManualNotificationDto;

      const result = await this.service.sendManualNotification(
        user.schoolId,
        user.userId,
        body
      );

      sendSuccess(
        res,
        201,
        result,
        `Successfully sent ${result.createdCount} notifications`
      );
    } catch (error) {
      next(error);
    }
  };
}

export const notificationController = new NotificationController();
