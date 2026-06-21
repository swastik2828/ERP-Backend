import { Request, Response, NextFunction } from 'express';
import { StudentController } from '../controllers/student.controller';
import { StudentService } from '../services/student.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

// Mock the Service and Response Utility
jest.mock('../services/student.service');
jest.mock('../../../utils/response.util');

describe('StudentController Tests ', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: { id: 'student-123' },
      body: { newClassId: 'class-2', academicSessionId: 'session-2' },
      user: { id: 'admin-123', schoolId: 'school-123', role: 'SCHOOL_ADMIN', email: 'admin@test.com' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('promote', () => {
    it('should successfully format the response on valid promotion [cite: 383]', async () => {
      const mockResult = { id: 'student-123', classId: 'class-2' };
      (StudentService.prototype.promoteStudent as jest.Mock).mockResolvedValue(mockResult);

      await StudentController.promote(mockReq as Request, mockRes as Response, mockNext);

      expect(StudentService.prototype.promoteStudent).toHaveBeenCalledWith(
        'student-123', 'school-123', mockReq.body, 'admin-123'
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, 200, mockResult, 'Student promoted successfully');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw an AppError if authorization (schoolId) is missing [cite: 381]', async () => {
      mockReq.user = undefined; // Simulate missing auth

      await StudentController.promote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg.statusCode).toBe(401);
      expect(errorArg.message).toContain('Unauthorized');
    });

    it('should pass errors to the global error handler [cite: 384]', async () => {
      const dbError = new Error('Database connection failed');
      (StudentService.prototype.promoteStudent as jest.Mock).mockRejectedValue(dbError);

      await StudentController.promote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });
});