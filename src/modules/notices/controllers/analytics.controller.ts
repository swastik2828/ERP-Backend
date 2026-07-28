import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  private getRouteParam(param: string | string[] | undefined): string {
    if (typeof param === 'string') return param;
    return param?.[0] ?? '';
  }

  getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('ERR_UNAUTHORIZED: Unauthorized', 401);
      
      const stats = await this.analyticsService.getDashboardStats(req.user.schoolId);
      sendSuccess(res, 200, stats, 'Dashboard statistics retrieved');
    } catch (error) {
      next(error);
    }
  };

  getNoticeReadReceipts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('ERR_UNAUTHORIZED: Unauthorized', 401);

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const noticeId = this.getRouteParam(req.params.id);

      const receipts = await this.analyticsService.getNoticeReadReceipts(req.user.schoolId, noticeId, page, pageSize);
      sendSuccess(res, 200, receipts, 'Read receipts retrieved');
    } catch (error) {
      next(error);
    }
  };

  getNoticeAcknowledgments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('ERR_UNAUTHORIZED: Unauthorized', 401);

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const noticeId = this.getRouteParam(req.params.id);

      const acks = await this.analyticsService.getNoticeAcknowledgments(req.user.schoolId, noticeId, page, pageSize);
      sendSuccess(res, 200, acks, 'Acknowledgments retrieved');
    } catch (error) {
      next(error);
    }
  };
}