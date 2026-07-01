import { feeRepository } from '../repositories/fee.repository';
import prisma from '../../../database/prisma';
import { RecurringType, TransactionType } from '@prisma/client';

// Mock the Prisma Client
jest.mock('../../../database/prisma', () => ({
  feeCategory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  receipt: {
    create: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
  feeLedger: {
    create: jest.fn(),
  }
}));

describe('FeeRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fee Categories', () => {
    it('should create a fee category via prisma', async () => {
      const mockData = {
        schoolId: 'school-1',
        name: 'Library Fee',
        code: 'LIB',
        recurringType: RecurringType.ANNUAL
      };
      
      (prisma.feeCategory.create as jest.Mock).mockResolvedValue({ id: 'cat-1', ...mockData });

      const result = await feeRepository.createFeeCategory(mockData);
      
      expect(prisma.feeCategory.create).toHaveBeenCalledWith({ data: mockData });
      expect(result.id).toBe('cat-1');
    });

    it('should fetch active fee categories for a school', async () => {
      (prisma.feeCategory.findMany as jest.Mock).mockResolvedValue([{ id: 'cat-1' }]);

      await feeRepository.getFeeCategories('school-1');

      expect(prisma.feeCategory.findMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1', isActive: true },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('Number Generation', () => {
    it('should correctly pad the sequence for the next receipt number', async () => {
      const year = new Date().getFullYear();
      
      // Assume there are 14 receipts already in the database
      (prisma.receipt.count as jest.Mock).mockResolvedValue(14);

      const nextNumber = await feeRepository.generateNextReceiptNumber();
      
      expect(prisma.receipt.count).toHaveBeenCalledWith({
        where: { receiptNumber: { startsWith: `RCP-${year}-` } }
      });
      // 14 + 1 = 15, padded to 6 digits = 000015
      expect(nextNumber).toBe(`RCP-${year}-000015`); 
    });
  });

  describe('Ledger & Payments', () => {
    it('should append a ledger entry immutably', async () => {
      const ledgerData = {
        studentId: 'student-1',
        transactionType: TransactionType.PAYMENT,
        amount: 500,
        balanceAfter: 1500
      };

      await feeRepository.createLedgerEntry(ledgerData);

      expect(prisma.feeLedger.create).toHaveBeenCalledWith({ data: ledgerData });
    });
  });
});