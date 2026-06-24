import { MarkService } from '../services/mark.service';
import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';

// Mock Prisma
jest.mock('../../../database/prisma', () => ({
  examSubject: { findUnique: jest.fn() },
  studentMark: { upsert: jest.fn(), updateMany: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(async (callback) => callback(prisma)),
}));

describe('MarkService', () => {
  let markService: MarkService;
  const mockSchoolId = 'school-1';
  const mockUserId = 'user-1';

  beforeEach(() => {
    markService = new MarkService();
    jest.clearAllMocks();
  });

  describe('bulkEnterMarks', () => {
    const marksData = [
      { studentId: 'stu-1', examSubjectId: 'es-1', marksObtained: 85 },
      { studentId: 'stu-2', examSubjectId: 'es-1', marksObtained: 92 }
    ];

    it('should successfully upsert marks and create audit logs', async () => {
      // Mock valid exam subject with maxMarks = 100, exam unlocked
      (prisma.examSubject.findUnique as jest.Mock).mockResolvedValue({
        id: 'es-1',
        maxMarks: 100,
        exam: { schoolId: mockSchoolId, isLocked: false }
      });

      (prisma.studentMark.upsert as jest.Mock).mockResolvedValue({ id: 'mark-id' });

      const result = await markService.bulkEnterMarks(marksData, mockSchoolId, mockUserId, '127.0.0.1');

      expect(result.count).toBe(2);
      expect(prisma.studentMark.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if a mark exceeds the maximum allowed', async () => {
      (prisma.examSubject.findUnique as jest.Mock).mockResolvedValue({
        id: 'es-1',
        maxMarks: 50, // Max marks is 50, but marksData contains 85 and 92
        exam: { schoolId: mockSchoolId, isLocked: false }
      });

      await expect(
        markService.bulkEnterMarks(marksData, mockSchoolId, mockUserId)
      ).rejects.toThrow(AppError);
    });

    it('should throw an error if the exam is locked', async () => {
      (prisma.examSubject.findUnique as jest.Mock).mockResolvedValue({
        id: 'es-1',
        maxMarks: 100,
        exam: { schoolId: mockSchoolId, isLocked: true } // Locked!
      });

      await expect(
        markService.bulkEnterMarks(marksData, mockSchoolId, mockUserId)
      ).rejects.toThrow('Cannot enter marks: Examination is locked.');
    });
  });

  describe('verifyMarks', () => {
    it('should verify marks and create an audit log', async () => {
      (prisma.studentMark.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await markService.verifyMarks('es-1', ['stu-1', 'stu-2'], mockSchoolId, mockUserId, '127.0.0.1');

      expect(result.verifiedCount).toBe(5);
      expect(prisma.studentMark.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ verifiedBy: mockUserId })
      }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'MARK_VERIFIED' })
      }));
    });
  });
});