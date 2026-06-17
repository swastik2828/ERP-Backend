import { Router } from 'express';
import { teacherController } from '../controllers/teacher.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware'; // <-- Fixed Import
import { Role } from '@prisma/client';
import {
  createTeacherSchema,
  updateTeacherSchema,
  updateTeacherStatusSchema,
  getTeachersQuerySchema,
  assignClassTeacherSchema
} from '../validators/teacher.validator';

const router = Router();

// Apply Authentication to all Teacher Routes
router.use(requireAuth);

// ==========================================
// ADMIN ONLY ROUTES (Create, Update, Status, Assignments)
// ==========================================
router.post(
  '/',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN]), // <-- Changed function name
  validateRequest(createTeacherSchema),
  teacherController.createTeacher
);

router.patch(
  '/:id',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN]), // <-- Changed function name
  validateRequest(updateTeacherSchema),
  teacherController.updateTeacher
);

router.patch(
  '/:id/status',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), // <-- Changed function name
  validateRequest(updateTeacherStatusSchema),
  teacherController.updateStatus
);

router.post(
  '/:id/class-assignments',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), // <-- Changed function name
  validateRequest(assignClassTeacherSchema),
  teacherController.assignClassTeacher
);

// ==========================================
// SHARED ROUTES (View, Search)
// ==========================================
router.get(
  '/',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN, Role.TEACHER]), // <-- Changed function name
  validateRequest(getTeachersQuerySchema),
  teacherController.getTeachers
);

router.get(
  '/:id',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN, Role.TEACHER]), // <-- Changed function name
  teacherController.getTeacherById
);

export default router;