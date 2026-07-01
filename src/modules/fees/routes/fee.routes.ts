import { Router } from 'express';
import { feeController } from '../controllers/fee.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { authenticate } from '../../../middlewares/auth.middleware';
import { authorizeRoles } from '../../../middlewares/role.middleware';
import { Role } from '@prisma/client';
import { 
  createFeeCategorySchema, 
  createFeeStructureSchema, 
  assignFeeSchema, 
  collectPaymentSchema,
  getStudentLedgerSchema
} from '../validators/fee.validator';

const router = Router();

// Apply authentication to all fee routes
router.use(authenticate);

// ==========================================
// FEE CATEGORY ROUTES
// ==========================================
// PRD Rule: Super Admin & Admin can manage categories
router.post(
  '/categories',
  authorizeRoles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN),
  validateRequest(createFeeCategorySchema),
  feeController.createFeeCategory
);

router.get(
  '/categories',
  authorizeRoles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN),
  feeController.getFeeCategories
);

// ==========================================
// FEE STRUCTURE ROUTES
// ==========================================
router.post(
  '/structures',
  authorizeRoles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN),
  validateRequest(createFeeStructureSchema),
  feeController.createFeeStructure
);

// ==========================================
// STUDENT FEE ASSIGNMENT & LEDGER ROUTES
// ==========================================
router.post(
  '/students/:studentId/assign-fee',
  authorizeRoles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN),
  validateRequest(assignFeeSchema),
  feeController.assignFee
);

router.get(
  '/students/:studentId/ledger',
  authorizeRoles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN, Role.STUDENT, Role.PARENT),
  validateRequest(getStudentLedgerSchema),
  feeController.getStudentLedger
);

// ==========================================
// PAYMENT & RECEIPT ROUTES
// ==========================================
// PRD Rule: Data Entry Admin can also collect offline payments and generate receipts
router.post(
  '/payments',
  authorizeRoles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN),
  validateRequest(collectPaymentSchema),
  feeController.collectPayment
);

export default router;