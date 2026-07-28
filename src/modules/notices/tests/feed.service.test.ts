import { FeedService } from '../services/feed.service';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';

// FIX: Use require inside the factory to prevent Jest hoisting ReferenceErrors
jest.mock('../../../database/prisma', () => ({
  __esModule: true,
  default: require('jest-mock-extended').mockDeep(),
}));

import prisma from '../../../database/prisma';

describe('FeedService', () => {
  let feedService: FeedService;
  const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    feedService = new FeedService();
    jest.clearAllMocks();
  });

  describe('getPersonalizedFeed', () => {
    it('should query published notices based on user targets', async () => {
      const mockUser = {
        id: 'student-1',
        schoolId: 'school-1',
        role: 'STUDENT',
        classId: 'class-1',
        sectionId: 'section-1',
      };

      const mockQuery = { page: 1, pageSize: 10 };

      // Mock database response
      prismaMock.notice.findMany.mockResolvedValue([
        {
          id: 'notice-1',
          title: 'Exam Schedule',
          readReceipts: [{ id: 'receipt-1' }],
          acknowledgments: [],
        } as any
      ]);

      const result = await feedService.getPersonalizedFeed(mockUser, mockQuery);

      // Verify prisma was called with the correct OR conditions for targeting
      expect(prismaMock.notice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: 'school-1',
            status: 'PUBLISHED',
            deletedAt: null,
            targets: {
              some: {
                OR: [
                  { targetType: 'ALL' },
                  { targetType: 'ROLE', targetRole: 'STUDENT' },
                  { targetType: 'INDIVIDUAL', targetUserId: 'student-1' },
                  { targetType: 'CLASS', targetClassId: 'class-1' },
                  { targetType: 'SECTION', targetSectionId: 'section-1' },
                ]
              }
            }
          }),
          skip: 0,
          take: 10,
        })
      );

      // Verify data mapping (read status)
      expect(result[0].isRead).toBe(true);
      expect(result[0].acknowledgmentStatus).toBeNull();
      expect(result[0].readReceipts).toBeUndefined(); // Should be cleaned up
    });
  });
});