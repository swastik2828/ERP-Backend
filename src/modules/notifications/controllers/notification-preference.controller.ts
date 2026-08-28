import { Request, Response, NextFunction } from 'express';
import { NotificationPreferenceService, notificationPreferenceService } from '../services/notification-preference.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';
import { NOTIFICATION_ERROR_CODES } from '../constants/notification.constants';
import { UpdatePreferencesDto } from '../dtos/notification-preference.dto';

export class NotificationPreferenceController {
  constructor(
    private readonly service: NotificationPreferenceService = notificationPreferenceService
  ) {}

  private extractUserId(req: Request): string {
    if (!req.user || !req.user.id) {
      throw new AppError(
        'User not authenticated',
        401,
        NOTIFICATION_ERROR_CODES.UNAUTHORIZED_NOTIFICATION_ACCESS
      );
    }
    return req.user.id;
  }

  public getPreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.extractUserId(req);
      const preferences = await this.service.getUserPreferences(userId);

      sendSuccess(
        res,
        200,
        preferences,
        'Notification preferences retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  public updatePreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.extractUserId(req);
      const { preferences } = req.body as UpdatePreferencesDto;

      const updated = await this.service.updatePreferences(userId, preferences);

      sendSuccess(
        res,
        200,
        updated,
        'Notification preferences updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}

export const notificationPreferenceController =
  new NotificationPreferenceController();
