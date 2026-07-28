import { Request, Response, NextFunction } from 'express';
import { NoticeService } from '../services/notice.service';
import { FeedService } from '../services/feed.service';
import { InteractionService } from '../services/interaction.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

export class NoticeController {
  constructor(
    private noticeService: NoticeService,
    private feedService: FeedService,
    private interactionService: InteractionService
  ) {}

  private extractUser(req: Request) {
    if (!req.user || !req.user.id || !req.user.schoolId || !req.user.role) {
      throw new AppError('ERR_UNAUTHORIZED: User not authenticated', 401);
    }
    return {
      id: req.user.id as string,
      schoolId: req.user.schoolId as string,
      role: req.user.role as string,
    };
  }

  private parseHeader(val: string | string[] | undefined): string {
    if (!val) return '';
    if (Array.isArray(val)) return val[0];
    return val;
  }

  private getRouteParam(val: string | string[] | undefined): string {
    if (typeof val === 'string') return val;
    return val?.[0] ?? '';
  }

  private getClientInfo(req: Request) {
    return {
      ip: this.parseHeader(req.ip || req.socket?.remoteAddress),
      ua: this.parseHeader(req.headers['user-agent']),
    };
  }

  // Explicit Promise<void> fixes the "Not all code paths return a value" error
  getFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const feed = await this.feedService.getPersonalizedFeed(user as any, req.query);
      sendSuccess(res, 200, feed, 'Personalized notice feed retrieved');
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const noticeId = this.getRouteParam(req.params.id);
      const { ip, ua } = this.getClientInfo(req);
      await this.interactionService.markAsRead(user.schoolId, noticeId, user.id, ip, ua);
      sendSuccess(res, 200, null, 'Notice marked as read');
    } catch (error) {
      next(error);
    }
  };

  acknowledge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const noticeId = this.getRouteParam(req.params.id);
      const { ip, ua } = this.getClientInfo(req);
      await this.interactionService.acknowledgeNotice(user.schoolId, noticeId, user.id, req.body, ip, ua);
      sendSuccess(res, 200, null, 'Circular acknowledged successfully');
    } catch (error) {
      next(error);
    }
  };

  createNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const notice = await this.noticeService.createNotice(user.schoolId, user.id, user.role, req.body);
      sendSuccess(res, 201, notice, 'Notice created successfully');
    } catch (error) {
      next(error);
    }
  };

  getNoticeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const noticeId = this.getRouteParam(req.params.id);
      const notice = await this.noticeService.getNoticeById(user.schoolId, noticeId, user.id, user.role);
      sendSuccess(res, 200, notice, 'Notice retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const noticeId = this.getRouteParam(req.params.id);
      const notice = await this.noticeService.updateNotice(user.schoolId, noticeId, user.id, user.role, req.body);
      sendSuccess(res, 200, notice, 'Notice updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const noticeId = this.getRouteParam(req.params.id);
      await this.noticeService.deleteNotice(user.schoolId, noticeId, user.id, user.role);
      sendSuccess(res, 200, null, 'Notice deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  publishNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const noticeId = this.getRouteParam(req.params.id);
      const notice = await this.noticeService.publishNotice(user.schoolId, noticeId, user.id, user.role);
      sendSuccess(res, 200, notice, 'Notice published successfully');
    } catch (error) {
      next(error);
    }
  };

  archiveNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const noticeId = this.getRouteParam(req.params.id);
      const notice = await this.noticeService.archiveNotice(user.schoolId, noticeId, user.id, user.role);
      sendSuccess(res, 200, notice, 'Notice archived successfully');
    } catch (error) {
      next(error);
    }
  };

  pinNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const noticeId = this.getRouteParam(req.params.id);
      const notice = await this.noticeService.pinNotice(user.schoolId, noticeId, user.id, user.role);
      sendSuccess(res, 200, notice, 'Notice pinned successfully');
    } catch (error) {
      next(error);
    }
  };

  unpinNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const noticeId = this.getRouteParam(req.params.id);
      const notice = await this.noticeService.unpinNotice(user.schoolId, noticeId, user.id, user.role);
      sendSuccess(res, 200, notice, 'Notice unpinned successfully');
    } catch (error) {
      next(error);
    }
  };
}