import { StudentService } from '../services/student.service';
import { prisma } from '../../../database/prisma';
import { StudentStatus, AcademicEventType } from '@prisma/client';
import { AppError } from '../../../errors/AppError';

// Mock the Prisma Client
jest.mock('../../../database/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    student: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    academicHistory: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

describe('StudentService Lifecycle Tests', () => {
  let studentService: StudentService;
  const mockSchoolId = 'school-123';
  const mockAuditUserId = 'admin-123';
  const mockStudentId = 'student-123';

  beforeEach(() => {
    studentService = new StudentService();
    jest.clearAllMocks();

    // Mock $transaction to simply execute the callback
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(prisma);
    });
  });

  describe('promoteStudent [cite: 337-343]', () => {
    it('should successfully promote an ACTIVE student', async () => {
      // Arrange
      const mockStudent = { id: mockStudentId, classId: 'class-1', sectionId: 'sec-1', status: StudentStatus.ACTIVE };
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.student.update as jest.Mock).mockResolvedValue({ ...mockStudent, classId: 'class-2' });

      // Act
      const result = await studentService.promoteStudent(
        mockStudentId, 
        mockSchoolId, 
        { newClassId: 'class-2', academicSessionId: 'session-2' }, 
        mockAuditUserId
      );

      // Assert
      expect(result.classId).toBe('class-2');
      expect(prisma.academicHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: AcademicEventType.PROMOTION,
          newClassId: 'class-2',
        })
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'PROMOTE' })
      });
    });

    it('should reject promotion for non-ACTIVE students', async () => {
      // Arrange
      const mockStudent = { id: mockStudentId, status: StudentStatus.WITHDRAWN };
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);

      // Act & Assert
      await expect(
        studentService.promoteStudent(mockStudentId, mockSchoolId, { newClassId: 'class-2', academicSessionId: 'session-2' }, mockAuditUserId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('transferStudent [cite: 344-348]', () => {
    it('should successfully execute a transfer and update status', async () => {
      // Arrange
      (prisma.student.update as jest.Mock).mockResolvedValue({ id: mockStudentId, status: StudentStatus.TRANSFERRED });

      // Act
      const result = await studentService.transferStudent(
        mockStudentId, 
        mockSchoolId, 
        { transferType: 'EXTERNAL', reason: 'Moving cities' }, 
        mockAuditUserId
      );

      // Assert
      expect(result.status).toBe(StudentStatus.TRANSFERRED);
      expect(prisma.academicHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ eventType: AcademicEventType.TRANSFER })
      });
    });
  });

  describe('withdrawStudent [cite: 349-352]', () => {
    it('should successfully withdraw student', async () => {
      (prisma.student.update as jest.Mock).mockResolvedValue({ id: mockStudentId, status: StudentStatus.WITHDRAWN });

      const result = await studentService.withdrawStudent(
        mockStudentId, mockSchoolId, { reason: 'Financial' }, mockAuditUserId
      );

      expect(result.status).toBe(StudentStatus.WITHDRAWN);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'WITHDRAW' })
      });
    });
  });
});