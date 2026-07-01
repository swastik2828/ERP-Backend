import { z } from 'zod';
import { 
  createFeeCategorySchema, 
  createFeeStructureSchema, 
  collectPaymentSchema 
} from '../validators/fee.validator';

export type CreateFeeCategoryDto = z.infer<typeof createFeeCategorySchema>['body'];
export type UpdateFeeCategoryDto = z.infer<typeof createFeeCategorySchema>['body'];

export type CreateFeeStructureDto = z.infer<typeof createFeeStructureSchema>['body'];

export type CollectPaymentDto = z.infer<typeof collectPaymentSchema>['body'];