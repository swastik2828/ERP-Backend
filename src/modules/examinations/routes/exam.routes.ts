import { Router } from 'express';
import { ExamController } from '../controllers/exam.controller';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireTenantIsolation } from '../../../middlewares/tenant.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { CreateExamSchema, AddExamSubjectSchema } from '../validators/exam.validator';
import { BulkMarkEntrySchema, VerifyMarksSchema } from '../validators/mark.validator';

const router = Router();
const examController = new ExamController();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(requireTenantIsolation); // Fixed import and name

// ==========================================
// EXAM DEFINITION ROUTES
// ==========================================
router.post(
  '/',
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), // Fixed role middleware
  validateRequest(CreateExamSchema),
  examController.createExam
);

router.post(
  '/:examId/subjects',
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validateRequest(AddExamSubjectSchema),
  examController.addSubject
);

// ==========================================
// MARKS ENTRY & VERIFICATION ROUTES
// ==========================================
router.post(
  '/marks/bulk',
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']),
  validateRequest(BulkMarkEntrySchema),
  examController.bulkEnterMarks
);

router.post(
  '/marks/verify',
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), // Only admins can verify and lock marks
  validateRequest(VerifyMarksSchema),
  examController.verifyMarks
);

// ==========================================
// RESULTS & REPORT CARD ROUTES
// ==========================================
router.post(
  '/results/generate',
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  // Add a Zod validator for { examId, classId } here in the future
  examController.generateResults
);

router.get(
  '/report-cards/student/:studentId',
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER', 'PARENT', 'STUDENT']),
  examController.getReportCard
);

export default router;