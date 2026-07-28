import { Request, Response, NextFunction } from 'express';
import { NoticeController } from '../controllers/notices.controller';
import { NoticeService } from '../services/notice.service';
import { FeedService } from '../services/feed.service';
import { InteractionService } from '../services/interaction.service';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

// Mock the response utility
jest.mock('../../../utils/response.util', () => ({
  sendSuccess: jest.fn(),
}));

describe('NoticeController', () => {
  let noticeController: NoticeController;
  let noticeServiceMock: MockProxy<NoticeService>;
  let feedServiceMock: MockProxy<FeedService>;
  let interactionServiceMock: MockProxy<InteractionService>;

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // FIX: Clear mock histories to prevent memory leakage between tests
    jest.clearAllMocks();

    noticeServiceMock = mockDeep<NoticeService>();
    feedServiceMock = mockDeep<FeedService>();
    interactionServiceMock = mockDeep<InteractionService>();

    noticeController = new NoticeController(
      noticeServiceMock,
      feedServiceMock,
      interactionServiceMock
    );

    mockReq = {
      user: {
        id: 'user-1',
        schoolId: 'school-1',
        role: 'STUDENT',
      } as any,
      params: {},
      query: {},
      body: {},
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest-test' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('getFeed', () => {
    it('should retrieve personalized feed and send success response', async () => {
      const mockFeed = [{ id: 'notice-1', title: 'Test Notice' }];
      feedServiceMock.getPersonalizedFeed.mockResolvedValue(mockFeed as any);

      await noticeController.getFeed(mockReq as Request, mockRes as Response, mockNext);

      expect(feedServiceMock.getPersonalizedFeed).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1', schoolId: 'school-1' }),
        mockReq.query
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        mockFeed,
        'Personalized notice feed retrieved'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if user is missing', async () => {
      mockReq.user = undefined;

      await noticeController.getFeed(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(sendSuccess).not.toHaveBeenCalled(); // This will now correctly be 0
    });
  });

  describe('markRead', () => {
    it('should mark notice as read and return success', async () => {
      mockReq.params = { id: 'notice-1' };
      
      await noticeController.markRead(mockReq as Request, mockRes as Response, mockNext);

      expect(interactionServiceMock.markAsRead).toHaveBeenCalledWith(
        'school-1',
        'notice-1',
        'user-1',
        '127.0.0.1',
        'jest-test'
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, 200, null, 'Notice marked as read');
    });
  });
});