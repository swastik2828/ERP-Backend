import { StudentRepository } from '../repositories/student.repository';
import { prisma } from '../../../database/prisma';
import { StudentStatus } from '@prisma/client';

jest.mock('../../../database/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    student: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() }
  },
}));

describe('StudentRepository Tests ', () => {
  let studentRepo: StudentRepository;
  const mockSchoolId = 'school-123';
  const mockAuditUserId = 'admin-123';

  beforeEach(() => {
    studentRepo = new StudentRepository();
    jest.clearAllMocks();

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(prisma);
    });
  });

  describe('findAll (Soft Delete Logic Validation) ', () => {
    it('should never return soft-deleted records', async () => {
      await studentRepo.findAll(mockSchoolId);

      // Verify that deletedAt: null is ALWAYS injected into the where clause
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: mockSchoolId,
            deletedAt: null // CRITICAL PRD REQUIREMENT
          })
        })
      );
    });
  });

  describe('softDelete ', () => {
    it('should stamp deletedAt and archive the student instead of hard deleting', async () => {
      const studentId = 'student-999';
      (prisma.student.update as jest.Mock).mockResolvedValue({ id: studentId, status: StudentStatus.ARCHIVED });

      await studentRepo.softDelete(studentId, mockAuditUserId);

      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: studentId },
        data: {
          deletedAt: expect.any(Date),
          status: StudentStatus.ARCHIVED
        }
      });
      
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'SOFT_DELETE' })
      });
    });
  });
});