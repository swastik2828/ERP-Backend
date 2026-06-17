import { SubjectService } from '../services/subject.service';
import { SubjectRepository } from '../repositories/subject.repository';
// import prisma from '../../../database/prisma';
import { SubjectType, SubjectCategory, SubjectStatus } from '@prisma/client';
import { AppError } from '../../../errors/AppError';

// Mock the repository
jest.mock('../repositories/subject.repository');

// Mock Prisma transaction to bypass the actual DB and provide a mock transaction client
jest.mock('../../../database/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn().mockImplementation(async (callback) => {
      const mockTx = {
        auditLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      return callback(mockTx);
    }),
  },
}));

describe('SubjectService', () => {
  const mockSchoolId = 'school-123';
  const mockActorId = 'admin-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubject', () => {
    it('should create a subject successfully and log the action', async () => {
      const input = {
        name: 'Mathematics',
        code: 'MATH101',
        subjectType: SubjectType.CORE,
        category: SubjectCategory.ACADEMIC,
        displayOrder: 1,
      };

      const mockCreatedSubject = { id: 'sub-123', ...input, schoolId: mockSchoolId };

      (SubjectRepository.findByCode as jest.Mock).mockResolvedValue(null);
      (SubjectRepository.create as jest.Mock).mockResolvedValue(mockCreatedSubject);

      const result = await SubjectService.createSubject(mockSchoolId, mockActorId, input);

      expect(SubjectRepository.findByCode).toHaveBeenCalledWith('MATH101', mockSchoolId, expect.anything());
      expect(SubjectRepository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mathematics' }), expect.anything());
      expect(result).toEqual(mockCreatedSubject);
    });

    it('should throw an AppError if the subject code already exists', async () => {
      const input = {
        name: 'Mathematics',
        code: 'MATH101',
        subjectType: SubjectType.CORE,
        category: SubjectCategory.ACADEMIC,
        displayOrder: 1,
      };

      // Simulate finding an existing subject
      (SubjectRepository.findByCode as jest.Mock).mockResolvedValue({ id: 'existing-123' });

      await expect(SubjectService.createSubject(mockSchoolId, mockActorId, input)).rejects.toThrow(AppError);
      expect(SubjectRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('deactivateSubject', () => {
    it('should soft-delete the subject by changing status to INACTIVE', async () => {
      const subjectId = 'sub-123';
      
      (SubjectRepository.findById as jest.Mock).mockResolvedValue({ id: subjectId, status: SubjectStatus.ACTIVE });
      (SubjectRepository.update as jest.Mock).mockResolvedValue({ id: subjectId, status: SubjectStatus.INACTIVE });

      const result = await SubjectService.deactivateSubject(mockSchoolId, mockActorId, subjectId);

      expect(SubjectRepository.update).toHaveBeenCalledWith(
        subjectId, 
        mockSchoolId, 
        expect.objectContaining({ status: SubjectStatus.INACTIVE }), 
        expect.anything()
      );
      expect(result.status).toBe(SubjectStatus.INACTIVE);
    });
  });
});