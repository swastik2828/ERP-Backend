import { 
  createFeeCategorySchema, 
  collectPaymentSchema, 
  assignFeeSchema 
} from '../validators/fee.validator';
import { RecurringType, PaymentMode } from '@prisma/client';

describe('Fee Validation Schemas', () => {

  describe('createFeeCategorySchema', () => {
    it('should validate a correct fee category payload', () => {
      const validData = {
        body: {
          name: 'Tuition Fee',
          code: 'TUI-01',
          recurringType: RecurringType.MONTHLY,
          description: 'Monthly tuition fee',
          isActive: true
        }
      };
      const result = createFeeCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject if name is too short', () => {
      const invalidData = {
        body: {
          name: 'T', // Too short
          code: 'TUI-01',
          recurringType: RecurringType.MONTHLY
        }
      };
      const result = createFeeCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be at least 2 characters');
      }
    });
  });

  describe('collectPaymentSchema', () => {
    it('should reject payment amounts less than or equal to 0', () => {
      const invalidData = {
        body: {
          studentId: '123e4567-e89b-12d3-a456-426614174000',
          amountPaid: -500, // Negative amount
          paymentMode: PaymentMode.CASH
        }
      };
      const result = collectPaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Payment amount must be greater than 0');
      }
    });

   it('should reject invalid UUIDs for studentId', () => {
      const invalidData = {
        body: {
          studentId: 'invalid-id',
          amountPaid: 1000,
          paymentMode: PaymentMode.UPI
        }
      };
      const result = collectPaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Fix: Changed 'invalid_string' to 'invalid_format'
        expect(result.error.issues[0].code).toBe('invalid_format');
      }
    });
  });

  describe('assignFeeSchema', () => {
    it('should validate correct assignment data', () => {
      const validData = {
        params: { studentId: '123e4567-e89b-12d3-a456-426614174000' },
        body: {
          feeStructureId: '123e4567-e89b-12d3-a456-426614174001',
          assignedAmount: 5000
        }
      };
      const result = assignFeeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});