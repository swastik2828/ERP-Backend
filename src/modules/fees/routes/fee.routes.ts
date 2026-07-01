import { Router } from 'express';
import { Role } from '@prisma/client';
import { feeController } from '../controllers/fee.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { requireAuth } from '../../../middlewares/auth.middleware'; // Correct import
import { requireRole, requireExactRole } from '../../../middlewares/role.middleware'; // Correct import
import { 
  createFeeCategorySchema, 
  createFeeStructureSchema, 
  assignFeeSchema, 
  collectPaymentSchema,
  getStudentLedgerSchema
} from '../validators/fee.validator';

const router = Router();

// Apply authentication to all fee routes
router.use(requireAuth);

// ==========================================
// FEE CATEGORY ROUTES
// ==========================================
// Admin and Super Admin can manage categories
router.post(
  '/categories',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]),
  validateRequest(createFeeCategorySchema),
  feeController.createFeeCategory
);

router.get(
  '/categories',
  requireRole(Role.DATA_ENTRY_ADMIN), // DATA_ENTRY_ADMIN and above
  feeController.getFeeCategories
);

// ==========================================
// FEE STRUCTURE ROUTES
// ==========================================
router.post(
  '/structures',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]),
  validateRequest(createFeeStructureSchema),
  feeController.createFeeStructure
);

// ==========================================
// STUDENT FEE ASSIGNMENT & LEDGER ROUTES
// ==========================================
router.post(
  '/students/:studentId/assign-fee',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]),
  validateRequest(assignFeeSchema),
  feeController.assignFee
);

router.get(
  '/students/:studentId/ledger',
  requireRole(Role.STUDENT), // Lowest role permitted to view ledger
  validateRequest(getStudentLedgerSchema),
  feeController.getStudentLedger
);

// ==========================================
// PAYMENT & RECEIPT ROUTES
// ==========================================
router.post(
  '/payments',
  requireRole(Role.DATA_ENTRY_ADMIN), // DATA_ENTRY_ADMIN and above
  validateRequest(collectPaymentSchema),
  feeController.collectPayment
);

export default router;