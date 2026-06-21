import { ParentService } from '../services/parent.service';
import { prisma } from '../../../database/prisma';
import { RelationshipType } from '@prisma/client';

// Mock the Prisma Client
jest.mock('../../../database/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    parent: { create: jest.fn() },
    parentStudent: { create: jest.fn(), delete: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

describe('ParentService Tests ', () => {
  let parentService: ParentService;
  const mockSchoolId = 'school-123';
  const mockAuditUserId = 'admin-123';
  const mockParentId = 'parent-123';
  const mockStudentId = 'student-123';

  beforeEach(() => {
    parentService = new ParentService();
    jest.clearAllMocks();

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(prisma);
    });
  });

  describe('createParent [cite: 363]', () => {
    it('should successfully create a parent profile and log the audit', async () => {
      const mockPayload = { firstName: 'John', lastName: 'Doe', mobile: '9876543210' };
      (prisma.parent.create as jest.Mock).mockResolvedValue({ id: mockParentId, ...mockPayload });

      const result = await parentService.createParent(mockSchoolId, 'user-123', mockPayload, mockAuditUserId);

      expect(result.id).toBe(mockParentId);
      expect(prisma.parent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ firstName: 'John', primaryPhone: '9876543210' })
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'CREATE', entityType: 'PARENT' })
      });
    });
  });

  describe('linkStudent (Enterprise Many-to-Many) [cite: 368-371]', () => {
    it('should link a parent to a student as a Primary Guardian', async () => {
      const mockPayload = { 
        relationshipType: RelationshipType.FATHER, 
        isPrimaryGuardian: true, 
        isEmergencyContact: true 
      };
      
      (prisma.parentStudent.create as jest.Mock).mockResolvedValue({ parentId: mockParentId, studentId: mockStudentId });

      await parentService.linkStudent(mockParentId, mockStudentId, mockPayload, mockAuditUserId);

      expect(prisma.parentStudent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: mockParentId,
          studentId: mockStudentId,
          relationshipType: RelationshipType.FATHER,
          isPrimaryGuardian: true
        })
      });
    });
  });

  describe('unlinkStudent', () => {
    it('should remove the parent-student relationship', async () => {
      await parentService.unlinkStudent(mockParentId, mockStudentId, mockAuditUserId);

      expect(prisma.parentStudent.delete).toHaveBeenCalledWith({
        where: { parentId_studentId: { parentId: mockParentId, studentId: mockStudentId } }
      });
    });
  });
});