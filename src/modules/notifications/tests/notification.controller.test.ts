import { Request, Response, NextFunction } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

jest.mock('../../../utils/response.util', () => ({
  sendSuccess: jest.fn(),
}));

describe('NotificationController', () => {
  let controller: NotificationController;
  let serviceMock: jest.Mocked<NotificationService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    serviceMock = {
      getNotifications: jest.fn(),
      getNotificationById: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      archiveNotification: jest.fn(),
      sendManualNotification: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    controller = new NotificationController(serviceMock);

    mockReq = {
      user: {
        id: 'user-1',
        schoolId: 'school-1',
        role: 'PARENT' as any,
        email: 'parent@example.com',
      },
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('getNotifications', () => {
    it('should retrieve notifications and send success response', async () => {
      const mockResult = {
        notifications: [{ id: 'notif-1' }] as any,
        pagination: { nextCursor: null, hasMore: false, limit: 20 },
      };

      serviceMock.getNotifications.mockResolvedValue(mockResult);

      await controller.getNotifications(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(serviceMock.getNotifications).toHaveBeenCalledWith(
        'school-1',
        'user-1',
        {}
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        mockResult.notifications,
        'Notifications retrieved successfully',
        mockResult.pagination
      );
    });

    it('should pass error to next() if unauthenticated', async () => {
      mockReq.user = undefined;

      await controller.getNotifications(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getNotificationById', () => {
    it('should retrieve single notification by ID', async () => {
      mockReq.params = { id: 'notif-1' };
      const mockItem = { id: 'notif-1', title: 'Test' } as any;

      serviceMock.getNotificationById.mockResolvedValue(mockItem);

      await controller.getNotificationById(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(serviceMock.getNotificationById).toHaveBeenCalledWith(
        'notif-1',
        'school-1',
        'user-1'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        mockItem,
        'Notification details retrieved'
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should retrieve unread count', async () => {
      serviceMock.getUnreadCount.mockResolvedValue({ count: 7 });

      await controller.getUnreadCount(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(serviceMock.getUnreadCount).toHaveBeenCalledWith('school-1', 'user-1');
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        { count: 7 },
        'Unread notification count retrieved'
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockReq.params = { id: 'notif-1' };
      serviceMock.markAsRead.mockResolvedValue({ success: true, isRead: true });

      await controller.markAsRead(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(serviceMock.markAsRead).toHaveBeenCalledWith(
        'notif-1',
        'school-1',
        'user-1'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        { success: true, isRead: true },
        'Notification marked as read'
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      serviceMock.markAllAsRead.mockResolvedValue({ updatedCount: 5 });

      await controller.markAllAsRead(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(serviceMock.markAllAsRead).toHaveBeenCalledWith('school-1', 'user-1');
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        { updatedCount: 5 },
        'Marked 5 notifications as read'
      );
    });
  });

  describe('archiveNotification', () => {
    it('should archive notification', async () => {
      mockReq.params = { id: 'notif-1' };
      serviceMock.archiveNotification.mockResolvedValue({ success: true });

      await controller.archiveNotification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(serviceMock.archiveNotification).toHaveBeenCalledWith(
        'notif-1',
        'school-1',
        'user-1'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        { success: true },
        'Notification archived successfully'
      );
    });
  });
});
