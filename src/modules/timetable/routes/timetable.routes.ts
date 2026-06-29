import { Router } from 'express';
import { TimetableController } from '../controllers/timetable.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware';
import { Role } from '@prisma/client';
import { 
  createTimetableSchema, 
  createTimetableSlotSchema, 
  copyTimetableSchema 
} from '../validators/timetable.validator';

const router = Router();

// Apply authentication to all timetable routes
router.use(requireAuth);

// ==========================================
// DATA ENTRY & ADMIN ROUTES
// ==========================================

// Create Draft: Allowed for SCHOOL_ADMIN and DATA_ENTRY_ADMIN
router.post(
  '/',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN]),
  validateRequest(createTimetableSchema),
  TimetableController.createDraft
);

// Add Slot: Subject to Conflict Engine
router.post(
  '/slots',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN]),
  validateRequest(createTimetableSlotSchema),
  TimetableController.addSlot
);

// Publish: Strictly SCHOOL_ADMIN only
router.post(
  '/:id/publish',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]),
  TimetableController.publish
);

// Copy Timetable
router.post(
  '/:id/copy',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN]),
  validateRequest(copyTimetableSchema),
  TimetableController.copy
);

// ==========================================
// SHARED VIEW ROUTES (Teachers, Parents, Students)
// ==========================================

// View Timetable Details (Accessible by anyone authenticated to the school)
router.get(
  '/:id',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT]),
  TimetableController.getById
);

export default router;