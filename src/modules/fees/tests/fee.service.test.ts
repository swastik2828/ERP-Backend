import { feeService } from '../services/fee.service';
import { feeRepository } from '../repositories/fee.repository';
import { AppError } from '../../../errors/AppError';
import { 
  PaymentMode, 
  TransactionType, 
  //PaymentStatus, 
  FeeAssignmentStatus,
  //RecurringType 
} from '@prisma/client';
import prisma from '../../../database/prisma';

// Mock Dependencies
jest.mock('../repositories/fee.repository');
jest.mock('../../../database/prisma', () => ({
  $transaction: jest.fn(async (callback) => {
    // Simulate Prisma transaction by passing a mocked tx object
    const tx = {
      studentFeeAssignment: {
        findUnique: jest.fn(),
        findMany: jest.fn()
      },
      auditLog: { create: jest.fn() }
    };
    return callback(tx);
  })
}));

describe('FeeService - Core Financial & Transaction Logic', () => {
  const mockStudentId = 'student-123';
  const mockSchoolId = 'school-123';
  const mockUserId = 'admin-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // FEE ASSIGNMENT TESTS
  // ==========================================
  describe('assignFeeToStudent', () => {
    it('should assign fee, calculate new balance, and append to ledger', async () => {
      const mockStructure = {
        id: 'struct-1',
        amount: 5000,
        feeCategory: { name: 'Tuition Fee' }
      };

      (feeRepository.getFeeStructureById as jest.Mock).mockResolvedValue(mockStructure);
      
      // Mock tx.studentFeeAssignment.findUnique (no existing assignment)
      const mockTx = {
        studentFeeAssignment: { findUnique: jest.fn().mockResolvedValue(null) },
        auditLog: { create: jest.fn() }
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));

      // Mock current balance to be ₹1000
      jest.spyOn(feeService, 'getCurrentBalance').mockResolvedValue(1000);
      
      (feeRepository.createFeeAssignment as jest.Mock).mockResolvedValue({ id: 'assign-1' });
      (feeRepository.createLedgerEntry as jest.Mock).mockResolvedValue(true);

      await feeService.assignFeeToStudent(mockStudentId, 'struct-1', mockUserId);

      // Verify Ledger Entry was created with Balance = 1000 (old) + 5000 (new) = 6000
      expect(feeRepository.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: TransactionType.FEE_ASSIGNED,
          amount: 5000,
          balanceAfter: 6000, 
          remarks: 'Assigned Tuition Fee'
        }),
        mockTx
      );

      // Verify Audit Log was created
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'ASSIGN_FEE' })
        })
      );
    });

    it('should throw error if fee is already assigned', async () => {
      (feeRepository.getFeeStructureById as jest.Mock).mockResolvedValue({ amount: 5000 });
      
      // Simulate existing assignment
      const mockTx = {
        studentFeeAssignment: { findUnique: jest.fn().mockResolvedValue({ id: 'existing-1' }) }
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));

      await expect(
        feeService.assignFeeToStudent(mockStudentId, 'struct-1', mockUserId)
      ).rejects.toThrow('Fee already assigned to this student');
    });
  });

  // ==========================================
  // PAYMENT COLLECTION & FIFO ALLOCATION TESTS
  // ==========================================
  describe('collectPayment (Including Partial & FIFO Allocation)', () => {
    it('should successfully process a full payment and allocate it FIFO', async () => {
      // 1. Current balance is 5000
      jest.spyOn(feeService, 'getCurrentBalance').mockResolvedValue(5000);

      // 2. Pending Assignments (Two assignments: 3000 and 2000)
      const mockPendingAssignments = [
        { id: 'assign-old', assignedAmount: 3000, status: FeeAssignmentStatus.PENDING },
        { id: 'assign-new', assignedAmount: 2000, status: FeeAssignmentStatus.PENDING }
      ];

      const mockTx = {
        studentFeeAssignment: { findMany: jest.fn().mockResolvedValue(mockPendingAssignments) },
        auditLog: { create: jest.fn() }
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));

      (feeRepository.generateNextPaymentNumber as jest.Mock).mockResolvedValue('PAY-1');
      (feeRepository.generateNextReceiptNumber as jest.Mock).mockResolvedValue('RCP-1');
      (feeRepository.createPayment as jest.Mock).mockResolvedValue({ id: 'pay-1' });
      (feeRepository.createReceipt as jest.Mock).mockResolvedValue({ id: 'rcp-1' });

      // Action: Student pays exactly 5000
      await feeService.collectPayment(mockSchoolId, mockUserId, {
        studentId: mockStudentId,
        amountPaid: 5000,
        paymentMode: PaymentMode.CASH
      });

      // Assertions
      // Ledger balance should drop to 0
      expect(feeRepository.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000, balanceAfter: 0 }),
        mockTx
      );

      // FIFO Allocation: Both assignments should be marked as PAID
      expect(feeRepository.updateAssignmentStatus).toHaveBeenCalledWith('assign-old', FeeAssignmentStatus.PAID, mockTx);
      expect(feeRepository.updateAssignmentStatus).toHaveBeenCalledWith('assign-new', FeeAssignmentStatus.PAID, mockTx);
    });

    it('should process a partial payment and update assignment statuses accordingly', async () => {
      // 1. Current balance is 5000
      jest.spyOn(feeService, 'getCurrentBalance').mockResolvedValue(5000);

      // 2. Pending Assignments
      const mockPendingAssignments = [
        { id: 'assign-old', assignedAmount: 3000, status: FeeAssignmentStatus.PENDING },
        { id: 'assign-new', assignedAmount: 2000, status: FeeAssignmentStatus.PENDING }
      ];

      const mockTx = {
        studentFeeAssignment: { findMany: jest.fn().mockResolvedValue(mockPendingAssignments) },
        auditLog: { create: jest.fn() }
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));
      (feeRepository.createPayment as jest.Mock).mockResolvedValue({ id: 'pay-1' });
      (feeRepository.createReceipt as jest.Mock).mockResolvedValue({ id: 'rcp-1' });

      // Action: Student pays only 4000
      await feeService.collectPayment(mockSchoolId, mockUserId, {
        studentId: mockStudentId,
        amountPaid: 4000,
        paymentMode: PaymentMode.BANK_TRANSFER
      });

      // Assertions
      // Ledger balance should drop to 1000
      expect(feeRepository.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 4000, balanceAfter: 1000 }),
        mockTx
      );

      // FIFO Allocation: Oldest is fully paid (4000 - 3000 = 1000 remaining)
      expect(feeRepository.updateAssignmentStatus).toHaveBeenCalledWith('assign-old', FeeAssignmentStatus.PAID, mockTx);
      // Newest is partially paid (1000 applied to 2000)
      expect(feeRepository.updateAssignmentStatus).toHaveBeenCalledWith('assign-new', FeeAssignmentStatus.PARTIAL, mockTx);
    });

    it('should throw an error and prevent negative balance if payment exceeds outstanding amount', async () => {
      jest.spyOn(feeService, 'getCurrentBalance').mockResolvedValue(1000);

      await expect(
        feeService.collectPayment(mockSchoolId, mockUserId, {
          studentId: mockStudentId,
          amountPaid: 1500, // Greater than balance
          paymentMode: PaymentMode.UPI
        })
      ).rejects.toThrow(AppError);
    });
  });
});