import { teacherService } from '../services/teacher.service';
import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import { Gender, EmploymentType } from '@prisma/client';

// Mock Prisma
jest.mock('../../../database/prisma', () => ({
  teacher: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}));

describe('TeacherService Unit Tests', () => {
  const mockSchoolId = 'school-123';
  const mockAdminId = 'admin-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTeacher', () => {
    const validDto = {
      firstName: 'Rahul',
      lastName: 'Sharma',
      gender: Gender.MALE,
      email: 'rahul@school.com',
      phone: '9876543210',
      employeeId: 'TCH-2026-001',
      employmentType: EmploymentType.FULL_TIME,
    };

    it('should throw AppError if Employee ID already exists', async () => {
      // Setup mock to simulate existing employee
      (prisma.teacher.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-id' });

      await expect(teacherService.createTeacher(mockSchoolId, mockAdminId, validDto))
        .rejects
        .toThrow(AppError);
        
      await expect(teacherService.createTeacher(mockSchoolId, mockAdminId, validDto))
        .rejects
        .toThrow('Employee ID already exists in this school');
    });

    it('should successfully create teacher and return temp password within transaction', async () => {
      // Simulate no existing employee
      (prisma.teacher.findFirst as jest.Mock).mockResolvedValue(null);
      
      // Simulate successful transaction
      const mockTeacherData = { id: 'teacher-123', firstName: 'Rahul' };
      (prisma.$transaction as jest.Mock).mockImplementation(async (_callback) => {
        // We aren't testing the inner prisma client of tx here, just the transaction wrapper
        return mockTeacherData;
      });

      const result = await teacherService.createTeacher(mockSchoolId, mockAdminId, validDto);

      expect(prisma.teacher.findFirst).toHaveBeenCalledWith({
        where: { schoolId: mockSchoolId, employeeId: validDto.employeeId }
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.teacher).toEqual(mockTeacherData);
      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword.length).toBeGreaterThan(0);
    });
  });
});