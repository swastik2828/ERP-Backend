import { ExamService } from '../services/exam.service';
import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import { ExamType } from '@prisma/client';

// Mock Prisma
jest.mock('../../../database/prisma', () => ({
  exam: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  examSubject: { findFirst: jest.fn(), create: jest.fn() },
  examSchedule: { findFirst: jest.fn(), create: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(async (callback) => callback(prisma)),
}));

describe('ExamService', () => {
  let examService: ExamService;
  const mockSchoolId = 'school-1';
  const mockUserId = 'user-1';

  beforeEach(() => {
    examService = new ExamService();
    jest.clearAllMocks();
  });

  describe('createExam', () => {
    const createDto = {
      academicSessionId: 'session-1',
      name: 'Mid Term',
      examType: ExamType.MID_TERM,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString()
    };

    it('should successfully create an exam and log it', async () => {
      // Setup mock to return null (no existing exam found)
      (prisma.exam.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.exam.create as jest.Mock).mockResolvedValue({ id: 'exam-1', ...createDto });

      const result = await examService.createExam(createDto, mockSchoolId, mockUserId, '127.0.0.1');

      expect(result).toBeDefined();
      expect(result.id).toBe('exam-1');
      expect(prisma.exam.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'EXAM_CREATED' })
      }));
    });

    it('should throw an error if exam name already exists in session', async () => {
      // Mock an existing exam
      (prisma.exam.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-exam' });

      await expect(
        examService.createExam(createDto, mockSchoolId, mockUserId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('addExamSubject', () => {
    const subjectDto = {
      subjectId: 'sub-1',
      classId: 'class-1',
      maxMarks: 100,
      passMarks: 33,
      weightage: 100
    };

    it('should map a subject to an exam successfully', async () => {
      // Mock valid, unlocked exam
      (prisma.exam.findFirst as jest.Mock).mockResolvedValue({ id: 'exam-1', isLocked: false, isPublished: false });
      // Mock no conflict
      (prisma.examSubject.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.examSubject.create as jest.Mock).mockResolvedValue({ id: 'es-1', ...subjectDto });

      const result = await examService.addExamSubject('exam-1', subjectDto, mockSchoolId, mockUserId);

      expect(result).toBeDefined();
      expect(prisma.examSubject.create).toHaveBeenCalled();
    });

    it('should throw error if exam is locked', async () => {
      (prisma.exam.findFirst as jest.Mock).mockResolvedValue({ id: 'exam-1', isLocked: true });

      await expect(
        examService.addExamSubject('exam-1', subjectDto, mockSchoolId, mockUserId)
      ).rejects.toThrow('Cannot modify subjects for a locked or published exam.');
    });
  });
});