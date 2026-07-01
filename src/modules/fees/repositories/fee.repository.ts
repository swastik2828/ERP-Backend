import prisma from '../../../database/prisma';
import { 
  FeeCategory, 
  FeeStructure, 
  StudentFeeAssignment, 
  FeeLedger, 
  Payment, 
  Receipt,
  Prisma 
} from '@prisma/client';

// Helper type to support both standard PrismaClient and TransactionClient
type PrismaTx = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export class FeeRepository {
  
  // ==========================================
  // FEE CATEGORY
  // ==========================================
  
  public async createFeeCategory(
    data: Prisma.FeeCategoryUncheckedCreateInput, 
    tx?: PrismaTx
  ): Promise<FeeCategory> {
    const db = tx || prisma;
    return db.feeCategory.create({ data });
  }

  public async getFeeCategories(schoolId: string): Promise<FeeCategory[]> {
    return prisma.feeCategory.findMany({
      where: { schoolId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async getFeeCategoryById(id: string): Promise<FeeCategory | null> {
    return prisma.feeCategory.findUnique({
      where: { id }
    });
  }

  public async updateFeeCategory(
    id: string, 
    data: Prisma.FeeCategoryUncheckedUpdateInput
  ): Promise<FeeCategory> {
    return prisma.feeCategory.update({
      where: { id },
      data
    });
  }

  // ==========================================
  // FEE STRUCTURE
  // ==========================================
  
  public async createFeeStructure(
    data: Prisma.FeeStructureUncheckedCreateInput, 
    tx?: PrismaTx
  ): Promise<FeeStructure> {
    const db = tx || prisma;
    return db.feeStructure.create({ data });
  }

  public async getFeeStructures(schoolId: string, sessionId?: string): Promise<FeeStructure[]> {
    return prisma.feeStructure.findMany({
      where: {
        schoolId,
        ...(sessionId ? { academicSessionId: sessionId } : {})
      },
      include: {
        feeCategory: true,
        class: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async getFeeStructureById(id: string): Promise<FeeStructure | null> {
    return prisma.feeStructure.findUnique({
      where: { id },
      include: { feeCategory: true }
    });
  }

  // ==========================================
  // STUDENT FEE ASSIGNMENTS
  // ==========================================
  
  public async createFeeAssignment(
    data: Prisma.StudentFeeAssignmentUncheckedCreateInput, 
    tx?: PrismaTx
  ): Promise<StudentFeeAssignment> {
    const db = tx || prisma;
    return db.studentFeeAssignment.create({ data });
  }

  public async getStudentAssignments(studentId: string): Promise<StudentFeeAssignment[]> {
    return prisma.studentFeeAssignment.findMany({
      where: { studentId },
      include: {
        feeStructure: {
          include: { feeCategory: true }
        }
      },
      orderBy: { assignedDate: 'asc' }
    });
  }

  public async updateAssignmentStatus(
    id: string, 
    status: Prisma.EnumFeeAssignmentStatusFieldUpdateOperationsInput['set'],
    tx?: PrismaTx
  ): Promise<StudentFeeAssignment> {
    const db = tx || prisma;
    return db.studentFeeAssignment.update({
      where: { id },
      data: { status }
    });
  }

  // ==========================================
  // FEE LEDGER
  // ==========================================
  
  public async createLedgerEntry(
    data: Prisma.FeeLedgerUncheckedCreateInput, 
    tx?: PrismaTx
  ): Promise<FeeLedger> {
    const db = tx || prisma;
    return db.feeLedger.create({ data });
  }

  public async getStudentLedger(studentId: string): Promise<FeeLedger[]> {
    return prisma.feeLedger.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' }
    });
  }

  public async getLatestLedgerEntry(studentId: string, tx?: PrismaTx): Promise<FeeLedger | null> {
    const db = tx || prisma;
    return db.feeLedger.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ==========================================
  // PAYMENTS & RECEIPTS
  // ==========================================
  
  public async createPayment(
    data: Prisma.PaymentUncheckedCreateInput, 
    tx?: PrismaTx
  ): Promise<Payment> {
    const db = tx || prisma;
    return db.payment.create({ data });
  }

  public async createReceipt(
    data: Prisma.ReceiptUncheckedCreateInput, 
    tx?: PrismaTx
  ): Promise<Receipt> {
    const db = tx || prisma;
    return db.receipt.create({ data });
  }

  public async getPaymentByNumber(paymentNumber: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { paymentNumber },
      include: { receipt: true }
    });
  }

  public async getReceiptByNumber(receiptNumber: string): Promise<Receipt | null> {
    return prisma.receipt.findUnique({
      where: { receiptNumber },
      include: {
        payment: {
          include: {
            student: true,
            collector: { select: { fullName: true } }
          }
        }
      }
    });
  }

  // ==========================================
  // UTILITIES (Number Generation)
  // ==========================================
  
  public async generateNextReceiptNumber(tx?: PrismaTx): Promise<string> {
    const db = tx || prisma;
    const year = new Date().getFullYear();
    // In a high-concurrency production app, a sequence table is preferred.
    // For this implementation, counting current year receipts works safely inside a transaction lock.
    const count = await db.receipt.count({
      where: {
        receiptNumber: { startsWith: `RCP-${year}-` }
      }
    });
    const nextSequence = (count + 1).toString().padStart(6, '0');
    return `RCP-${year}-${nextSequence}`;
  }

  public async generateNextPaymentNumber(tx?: PrismaTx): Promise<string> {
    const db = tx || prisma;
    const year = new Date().getFullYear();
    const count = await db.payment.count({
      where: {
        paymentNumber: { startsWith: `PAY-${year}-` }
      }
    });
    const nextSequence = (count + 1).toString().padStart(6, '0');
    return `PAY-${year}-${nextSequence}`;
  }
}

export const feeRepository = new FeeRepository();