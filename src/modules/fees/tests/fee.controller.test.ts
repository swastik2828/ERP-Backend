import { Request, Response, NextFunction } from 'express';
import { feeController } from '../controllers/fee.controller';
import { feeService } from '../services/fee.service';
import { feeRepository } from '../repositories/fee.repository';
import { AppError } from '../../../errors/AppError';
import { Role } from '@prisma/client';

// Mock Services and Repositories
jest.mock('../services/fee.service');
jest.mock('../repositories/fee.repository');

describe('FeeController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        schoolId: 'school-123',
        role: Role.SCHOOL_ADMIN,
        email: 'admin@school.com'
      },
      params: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createFeeCategory', () => {
    it('should return 201 and the created category on success', async () => {
      mockReq.body = { name: 'Sports Fee', code: 'SPT' };
      const mockCategory = { id: 'cat-1', name: 'Sports Fee' };
      
      (feeService.createFeeCategory as jest.Mock).mockResolvedValue(mockCategory);

      await feeController.createFeeCategory(mockReq as Request, mockRes as Response, mockNext);

      // Verify tenant isolation: controller must pass the user's schoolId, not trust the body
      expect(feeService.createFeeCategory).toHaveBeenCalledWith('school-123', mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Fee category created successfully',
        data: mockCategory
      });
    });

    it('should call next(error) if service throws an error', async () => {
      const error = new AppError('Fee category with this code already exists', 400);
      (feeService.createFeeCategory as jest.Mock).mockRejectedValue(error);

      await feeController.createFeeCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('assignFee', () => {
    it('should extract studentId from params and return 201 on success', async () => {
      mockReq.params = { studentId: 'student-1' };
      mockReq.body = { feeStructureId: 'struct-1' };
      
      const mockAssignment = { id: 'assign-1', status: 'PENDING' };
      (feeService.assignFeeToStudent as jest.Mock).mockResolvedValue(mockAssignment);

      await feeController.assignFee(mockReq as Request, mockRes as Response, mockNext);

      expect(feeService.assignFeeToStudent).toHaveBeenCalledWith('student-1', 'struct-1', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getStudentLedger', () => {
    it('should return 200 with the ledger history and current balance', async () => {
      mockReq.params = { studentId: 'student-1' };
      
      const mockLedger = [{ id: 'ledger-1', amount: 5000 }];
      (feeRepository.getStudentLedger as jest.Mock).mockResolvedValue(mockLedger);
      (feeService.getCurrentBalance as jest.Mock).mockResolvedValue(5000);

      await feeController.getStudentLedger(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          currentBalance: 5000,
          transactions: mockLedger
        }
      });
    });
  });

  describe('collectPayment', () => {
    it('should process payment and return 201 with payment and receipt data', async () => {
      mockReq.body = { studentId: 'student-1', amountPaid: 2000 };
      
      const mockResult = {
        payment: { id: 'pay-1' },
        receipt: { id: 'rcp-1' }
      };
      (feeService.collectPayment as jest.Mock).mockResolvedValue(mockResult);

      await feeController.collectPayment(mockReq as Request, mockRes as Response, mockNext);

      expect(feeService.collectPayment).toHaveBeenCalledWith('school-123', 'user-123', mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Payment collected and receipt generated successfully',
        data: mockResult
      });
    });
  });
});