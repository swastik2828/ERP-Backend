import { Router } from 'express';
import { SubjectController } from '../controllers/subject.controller';

import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { Role } from '@prisma/client';

import {
  createSubjectSchema,
  updateSubjectSchema,
  updateSubjectStatusSchema,
  querySubjectSchema,
  createCurriculumMappingSchema
} from '../validators/subject.validator';

const router = Router();

// Apply authentication to all subject routes
router.use(requireAuth);

// ==========================================
// Subject Master Routes
// ==========================================

router.post(
  '/',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN]),
  validateRequest(createSubjectSchema),
  SubjectController.createSubject
);

router.get(
  '/',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN, Role.TEACHER]),
  validateRequest(querySubjectSchema),
  SubjectController.listSubjects
);

router.get(
  '/:id',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN, Role.TEACHER]),
  SubjectController.getSubjectById
);

router.patch(
  '/:id',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN]),
  validateRequest(updateSubjectSchema),
  SubjectController.updateSubject
);

router.patch(
  '/:id/status',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]),
  validateRequest(updateSubjectStatusSchema),
  SubjectController.deactivateSubject
);

// ==========================================
// Curriculum Mapping Routes
// ==========================================

router.post(
  '/curriculum-mappings',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]),
  validateRequest(createCurriculumMappingSchema),
  SubjectController.addCurriculumMapping
);

router.get(
  '/curriculum-mappings',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN, Role.TEACHER]),
  SubjectController.listCurriculumMappings
);

router.delete(
  '/curriculum-mappings/:id',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]),
  SubjectController.removeCurriculumMapping
);

export default router;