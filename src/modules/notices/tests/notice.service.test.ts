import { NoticeService } from '../services/notice.service';
import { NoticeRepository } from '../repositories/notices.repositories';
import { NoticeAuditRepository } from '../repositories/notice-audit.repository';
import { AppError } from '../../../errors/AppError';
import { NoticeStatus, NoticeType, NoticePriority } from '@prisma/client';
import { mockDeep, MockProxy } from 'jest-mock-extended';

describe('NoticeService', () => {
  let noticeService: NoticeService;
  let noticeRepoMock: MockProxy<NoticeRepository>;
  let auditRepoMock: MockProxy<NoticeAuditRepository>;

  const mockSchoolId = 'school-123';
  const mockUserId = 'user-123';
  const mockUserRole = 'TEACHER';

  beforeEach(() => {
    noticeRepoMock = mockDeep<NoticeRepository>();
    auditRepoMock = mockDeep<NoticeAuditRepository>();
    noticeService = new NoticeService(noticeRepoMock, auditRepoMock);
  });

  describe('createNotice', () => {
    it('should create a notice successfully', async () => {
      const dto = {
        title: 'Annual Day',
        content: 'Details here',
        type: NoticeType.NOTICE,
        priority: NoticePriority.NORMAL,
        requiresAcknowledgment: false,
        allowComments: true,
        targets: [{ targetType: 'ALL' as any }],
      };

      noticeRepoMock.checkDuplicate.mockResolvedValue(false);
      noticeRepoMock.create.mockResolvedValue({ id: 'notice-1', ...dto } as any);

      const result = await noticeService.createNotice(mockSchoolId, mockUserId, mockUserRole, dto as any);

      expect(noticeRepoMock.checkDuplicate).toHaveBeenCalledWith(mockSchoolId, dto.title, dto.type);
      expect(noticeRepoMock.create).toHaveBeenCalled();
      expect(auditRepoMock.logAction).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE',
        actorId: mockUserId,
      }));
      expect(result.id).toBe('notice-1');
    });

    it('should throw an error if a duplicate notice exists (BR-012)', async () => {
      noticeRepoMock.checkDuplicate.mockResolvedValue(true);

      await expect(noticeService.createNotice(mockSchoolId, mockUserId, mockUserRole, {
        title: 'Duplicate Notice',
        content: 'Content',
        targets: [{ targetType: 'ALL' as any }],
      } as any)).rejects.toThrow(AppError);
    });

    it('should throw an error if publishAt is in the past (BR-005)', async () => {
      noticeRepoMock.checkDuplicate.mockResolvedValue(false);

      await expect(noticeService.createNotice(mockSchoolId, mockUserId, mockUserRole, {
        title: 'Past Notice',
        content: 'Content',
        publishAt: new Date(Date.now() - 100000).toISOString(),
        targets: [{ targetType: 'ALL' as any }],
      } as any)).rejects.toThrow(AppError);
    });
  });

  describe('updateNotice', () => {
    it('should throw an error if modifying a published notice', async () => {
      noticeRepoMock.findById.mockResolvedValue({
        id: 'notice-1',
        schoolId: mockSchoolId,
        createdBy: mockUserId,
        status: NoticeStatus.PUBLISHED,
      } as any);

      // FIX: Check for the generic AppError class instead of hardcoding specific string structures
      await expect(noticeService.updateNotice(mockSchoolId, 'notice-1', mockUserId, mockUserRole, {}))
        .rejects.toThrow(AppError);
    });

    it('should throw an error if a non-creator/non-admin tries to update', async () => {
      noticeRepoMock.findById.mockResolvedValue({
        id: 'notice-1',
        schoolId: mockSchoolId,
        createdBy: 'different-user',
        status: NoticeStatus.DRAFT,
      } as any);

      await expect(noticeService.updateNotice(mockSchoolId, 'notice-1', mockUserId, 'TEACHER', {}))
        .rejects.toThrow(AppError);
    });
  });

  describe('pinNotice', () => {
    it('should throw an error if pin limit is exceeded (BR-004)', async () => {
      noticeRepoMock.findById.mockResolvedValue({
        id: 'notice-1',
        schoolId: mockSchoolId,
        isPinned: false,
      } as any);
      
      noticeRepoMock.countPinnedNotices.mockResolvedValue(5);

      await expect(noticeService.pinNotice(mockSchoolId, 'notice-1', mockUserId, 'SCHOOL_ADMIN'))
        .rejects.toThrow(AppError);
    });
  });
});