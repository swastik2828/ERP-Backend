import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import { feeRepository } from '../repositories/fee.repository';
import { 
  CreateFeeCategoryDto, 
  CreateFeeStructureDto, 
  CollectPaymentDto 
} from '../dto/fee.dto';
import { 
  FeeCategory, 
  FeeStructure, 
  StudentFeeAssignment, 
  Payment,
  Receipt,
  TransactionType,
  FeeAssignmentStatus,
  PaymentStatus,
  Prisma
} from '@prisma/client';

type PrismaTx = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export class FeeService {
  
  // ==========================================
  // FEE CATEGORY & STRUCTURE
  // ==========================================
  
  public async createFeeCategory(schoolId: string, data: CreateFeeCategoryDto): Promise<FeeCategory> {
    const existing = await prisma.feeCategory.findUnique({
      where: { schoolId_code: { schoolId, code: data.code } }
    });

    if (existing) {
      throw new AppError('Fee category with this code already exists', 400);
    }

    return feeRepository.createFeeCategory({
      schoolId,
      ...data
    });
  }

  public async createFeeStructure(
    schoolId: string, 
    userId: string, 
    data: CreateFeeStructureDto
  ): Promise<FeeStructure> {
    return prisma.$transaction(async (tx) => {
      const structure = await feeRepository.createFeeStructure({
        schoolId,
        createdBy: userId,
        ...data,
        dueDate: new Date(data.dueDate),
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined
      }, tx);

      await this.logAudit(tx, userId, 'CREATE', 'FeeStructure', structure.id);
      return structure;
    });
  }

  // ==========================================
  // STUDENT FEE ASSIGNMENTS & LEDGER
  // ==========================================

  public async assignFeeToStudent(
    studentId: string, 
    feeStructureId: string, 
    userId: string
  ): Promise<StudentFeeAssignment> {
    return prisma.$transaction(async (tx) => {
      // 1. Validate structure exists
      const structure = await feeRepository.getFeeStructureById(feeStructureId);
      if (!structure) throw new AppError('Fee structure not found', 404);

      // 2. Prevent duplicate assignments
      const existing = await tx.studentFeeAssignment.findUnique({
        where: { studentId_feeStructureId: { studentId, feeStructureId } }
      });
      if (existing) throw new AppError('Fee already assigned to this student', 400);

      // 3. Create Assignment
      const assignment = await feeRepository.createFeeAssignment({
        studentId,
        feeStructureId,
        assignedAmount: structure.amount,
        status: FeeAssignmentStatus.PENDING
      }, tx);

      // 4. Calculate new balance & Append to Ledger
      const currentBalance = await this.getCurrentBalance(studentId, tx);
      const newBalance = currentBalance + structure.amount;
      
      // Typecast to let TS know the relational data was included by the repository
      const structureWithCategory = structure as FeeStructure & { feeCategory: FeeCategory };

      await feeRepository.createLedgerEntry({
        studentId,
        transactionType: TransactionType.FEE_ASSIGNED,
        amount: structure.amount,
        balanceAfter: newBalance,
        referenceId: assignment.id,
        createdBy: userId,
        remarks: `Assigned ${structureWithCategory.feeCategory.name}`
      }, tx);

      await this.logAudit(tx, userId, 'ASSIGN_FEE', 'StudentFeeAssignment', assignment.id);
      
      return assignment;
    });
  }

  public async getCurrentBalance(
    studentId: string, 
    tx?: PrismaTx 
  ): Promise<number> {
    const latestEntry = await feeRepository.getLatestLedgerEntry(studentId, tx);
    return latestEntry ? latestEntry.balanceAfter : 0;
  }

  // ==========================================
  // PAYMENTS & RECEIPTS (CORE FINANCIAL LOGIC)
  // ==========================================

  public async collectPayment(
    schoolId: string,
    userId: string, 
    data: CollectPaymentDto
  ): Promise<{ payment: Payment; receipt: Receipt }> {
    
    return prisma.$transaction(async (tx) => {
      // 1. Get current balance
      const currentBalance = await this.getCurrentBalance(data.studentId, tx);
      
      if (currentBalance <= 0) {
        throw new AppError('No outstanding balance for this student', 400);
      }
      if (data.amountPaid > currentBalance) {
        throw new AppError(`Payment amount (₹${data.amountPaid}) exceeds outstanding balance (₹${currentBalance})`, 400);
      }

      // 2. Generate Unique Numbers
      const paymentNumber = await feeRepository.generateNextPaymentNumber(tx);
      const receiptNumber = await feeRepository.generateNextReceiptNumber(tx);

      // 3. Create Payment Record
      const payment = await feeRepository.createPayment({
        paymentNumber,
        schoolId,
        studentId: data.studentId,
        amountPaid: data.amountPaid,
        paymentMode: data.paymentMode,
        transactionReference: data.transactionReference,
        remarks: data.remarks,
        paymentStatus: PaymentStatus.SUCCESS,
        collectedBy: userId
      }, tx);

      // 4. Create Receipt Record mapped to exactly one payment
      const receipt = await feeRepository.createReceipt({
        receiptNumber,
        paymentId: payment.id,
        generatedBy: userId
      }, tx);

      // 5. Update Ledger (Deduct Balance)
      const newBalance = currentBalance - data.amountPaid;
      await feeRepository.createLedgerEntry({
        studentId: data.studentId,
        transactionType: TransactionType.PAYMENT,
        amount: data.amountPaid,
        balanceAfter: newBalance,
        referenceId: payment.id,
        createdBy: userId,
        remarks: `Payment via ${data.paymentMode}`
      }, tx);

      // 6. Update Assignment Statuses (FIFO - First In First Out allocation)
      await this.allocatePaymentToAssignments(data.studentId, data.amountPaid, tx);

      // 7. Audit Logging
      await this.logAudit(tx, userId, 'COLLECT_PAYMENT', 'Payment', payment.id);
      await this.logAudit(tx, userId, 'GENERATE_RECEIPT', 'Receipt', receipt.id);

      return { payment, receipt };
    });
  }

  // FIFO Allocation logic for Partial/Full Payments
  private async allocatePaymentToAssignments(
    studentId: string, 
    paymentAmount: number, 
    tx: PrismaTx
  ): Promise<void> {
    let remainingAmountToAllocate = paymentAmount;

    const pendingAssignments = await tx.studentFeeAssignment.findMany({
      where: {
        studentId,
        status: { in: [FeeAssignmentStatus.PENDING, FeeAssignmentStatus.PARTIAL] }
      },
      orderBy: { assignedDate: 'asc' }
    });

    for (const assignment of pendingAssignments) {
      if (remainingAmountToAllocate <= 0) break;

      const isFullyCovered = remainingAmountToAllocate >= assignment.assignedAmount;
      
      if (isFullyCovered) {
        await feeRepository.updateAssignmentStatus(assignment.id, FeeAssignmentStatus.PAID, tx);
        remainingAmountToAllocate -= assignment.assignedAmount;
      } else {
        await feeRepository.updateAssignmentStatus(assignment.id, FeeAssignmentStatus.PARTIAL, tx);
        remainingAmountToAllocate = 0;
      }
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private async logAudit(
    tx: PrismaTx, 
    actorId: string, 
    action: string, 
    entityType: string, 
    entityId: string
  ) {
    await tx.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        ipAddress: 'System'
      }
    });
  }
}

export const feeService = new FeeService();