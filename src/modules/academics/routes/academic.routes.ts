import { Router } from 'express';
import { AcademicController } from '../controllers/academic.controller';
import { AcademicService } from '../services/academic.service';
import { ClassRepository } from '../repositories/class.repository';
import { SectionRepository } from '../repositories/section.repository';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware';
import { requireTenantIsolation } from '../../../middlewares/tenant.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { createClassSchema, queryClassSchema, updateClassSchema } from '../validators/class.validator';
import { createSectionSchema, querySectionSchema } from '../validators/section.validator';
import { createAssignmentSchema } from '../validators/assignment.validator';
import { bulkCreateSchema } from '../validators/bulk.validator';

const router = Router();

const classRepo = new ClassRepository();
const sectionRepo = new SectionRepository();
const academicService = new AcademicService(classRepo, sectionRepo);
const controller = new AcademicController(academicService);

router.use(requireAuth);
router.use(requireTenantIsolation);

// --- Class Routes ---
router.post('/classes', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), validateRequest(createClassSchema), controller.createClass);
router.get('/classes', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']), validateRequest(queryClassSchema), controller.getClasses);
router.patch('/classes/:id', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), validateRequest(updateClassSchema), controller.updateClass);
router.delete('/classes/:id', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), controller.archiveClass);

// --- Section Routes ---
router.post('/sections', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN']), validateRequest(createSectionSchema), controller.createSection);
router.get('/sections', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']), validateRequest(querySectionSchema), controller.getSections);
router.delete('/sections/:id', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), controller.archiveSection);

// --- Assignment Routes ---
router.post('/class-teachers', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), validateRequest(createAssignmentSchema), controller.assignTeacher);

// --- Bulk Route ---
router.post('/classes/bulk', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), validateRequest(bulkCreateSchema), controller.bulkCreateClasses);

export default router;