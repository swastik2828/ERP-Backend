import { z } from 'zod';
import { RecurringType, PaymentMode } from '@prisma/client';

// =======================
// Fee Category Validators
// =======================
export const createFeeCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    code: z.string().min(2, 'Code must be at least 2 characters').max(50),
    recurringType: z.nativeEnum(RecurringType),
    description: z.string().optional(),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateFeeCategorySchema = z.object({
  body: createFeeCategorySchema.shape.body.partial(),
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
});

// =======================
// Fee Structure Validators
// =======================
export const createFeeStructureSchema = z.object({
  body: z.object({
    academicSessionId: z.string().uuid(),
    classId: z.string().uuid(),
    feeCategoryId: z.string().uuid(),
    amount: z.number().positive('Amount must be greater than 0'),
    dueDate: z.string().datetime({ message: 'Must be a valid ISO date string' }),
    recurrence: z.nativeEnum(RecurringType),
    isOptional: z.boolean().optional().default(false),
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime().optional(),
  }),
});

// =======================
// Assignment Validators
// =======================
export const assignFeeSchema = z.object({
  body: z.object({
    feeStructureId: z.string().uuid(),
    assignedAmount: z.number().positive('Amount must be positive'),
  }),
  params: z.object({
    studentId: z.string().uuid('Invalid student ID'),
  }),
});

// =======================
// Payment & Receipt Validators
// =======================
export const collectPaymentSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    amountPaid: z.number().positive('Payment amount must be greater than 0'),
    paymentMode: z.nativeEnum(PaymentMode),
    transactionReference: z.string().max(100).optional(),
    remarks: z.string().optional(),
  }),
});

export const getStudentLedgerSchema = z.object({
  params: z.object({
    studentId: z.string().uuid('Invalid student ID'),
  }),
});