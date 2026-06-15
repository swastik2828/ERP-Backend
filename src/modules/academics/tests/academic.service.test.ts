import { AcademicService } from '../services/academic.service';
import { AppError } from '../../../errors/AppError';
import prisma from '../../../database/prisma';

// Mock Prisma
jest.mock('../../../database/prisma', () => ({
  academicSession: { findFirst: jest.fn() },
  student: { count: jest.fn() },
}));

describe('AcademicService Unit Tests', () => {
  let academicService: AcademicService;
  let mockClassRepo: any;
  let mockSectionRepo: any;

  beforeEach(() => {
    // Mock Repositories
    mockClassRepo = {
      create: jest.fn(),
      findByNameAndSession: jest.fn(),
      findById: jest.fn(),
    };
    mockSectionRepo = {
      findMany: jest.fn(),
    };

    academicService = new AcademicService(mockClassRepo, mockSectionRepo);
    jest.clearAllMocks();
  });

  describe('createClass', () => {
    it('should successfully create a class if it does not exist', async () => {
      // Arrange
      const dto = { name: 'Class 1', code: 'C1', displayOrder: 1, academicSessionId: 'session-id' };
      (prisma.academicSession.findFirst as jest.Mock).mockResolvedValue({ id: 'session-id' });
      mockClassRepo.findByNameAndSession.mockResolvedValue(null);
      mockClassRepo.create.mockResolvedValue({ id: 'class-id', ...dto });

      // Act
      const result = await academicService.createClass(dto, 'school-id', 'user-id');

      // Assert
      expect(result).toHaveProperty('id', 'class-id');
      expect(mockClassRepo.create).toHaveBeenCalledWith({ ...dto, schoolId: 'school-id', createdBy: 'user-id' });
    });

    it('should throw AppError 409 if class name already exists in the session', async () => {
      // Arrange
      const dto = { name: 'Class 1', code: 'C1', displayOrder: 1, academicSessionId: 'session-id' };
      (prisma.academicSession.findFirst as jest.Mock).mockResolvedValue({ id: 'session-id' });
      mockClassRepo.findByNameAndSession.mockResolvedValue({ id: 'existing-id' }); // Simulating duplicate

      // Act & Assert
      await expect(academicService.createClass(dto, 'school-id', 'user-id')).rejects.toThrow(AppError);
      await expect(academicService.createClass(dto, 'school-id', 'user-id')).rejects.toMatchObject({ statusCode: 409 });
      expect(mockClassRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getSections (Capacity Logic)', () => {
    it('should correctly calculate available seats based on student count', async () => {
      // Arrange
      const mockSections = [
        { id: 'sec-1', classId: 'cls-1', name: 'A', capacity: 40 },
        { id: 'sec-2', classId: 'cls-1', name: 'B', capacity: 30 }
      ];
      
      mockSectionRepo.findMany.mockResolvedValue({ data: mockSections, total: 2 });
      
      // Mock Prisma Student Count: 10 students in Sec A, 30 students in Sec B
      (prisma.student.count as jest.Mock)
        .mockResolvedValueOnce(10) // First call for sec-1
        .mockResolvedValueOnce(30); // Second call for sec-2

      // Act
      const result = await academicService.getSections('school-id', { page: 1, limit: 10 } as any);

      // Assert
      expect(result.data[0].currentStrength).toBe(10);
      expect(result.data[0].availableSeats).toBe(30); // 40 capacity - 10 strength

      expect(result.data[1].currentStrength).toBe(30);
      expect(result.data[1].availableSeats).toBe(0); // 30 capacity - 30 strength
    });
  });
});