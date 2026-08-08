import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller';
import { LeaveReportController } from '../controllers/leave-report.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { createLeaveSchema, reviewLeaveSchema, cancelLeaveSchema } from '../validators/leave.validator';

// Update these imports to match the EXACT names exported from your middleware files
import { requireAuth } from '../../../middlewares/auth.middleware'; 
import { requireExactRole } from '../../../middlewares/role.middleware'; 

const router = Router();

// Ensure all leave endpoints are authenticated
router.use(requireAuth);

// ==========================================
// STUDENT APIs
// ==========================================
router.post(
  '/student/leaves',
  requireExactRole(['STUDENT']),
  validateRequest(createLeaveSchema),
  LeaveController.submitLeave
);

router.get(
  '/student/leaves',
  requireExactRole(['STUDENT']),
  LeaveController.getMyLeaves
);

router.patch(
  '/student/leaves/:id/cancel',
  requireExactRole(['STUDENT']),
  validateRequest(cancelLeaveSchema),
  LeaveController.cancelLeave
);

// ==========================================
// PARENT APIs
// ==========================================
router.post(
  '/parent/leaves',
  requireExactRole(['PARENT']),
  validateRequest(createLeaveSchema),
  LeaveController.submitLeave
);

router.get(
  '/parent/leaves',
  requireExactRole(['PARENT']),
  LeaveController.getMyLeaves 
);

// ==========================================
// TEACHER APIs (Personal & Approvals)
// ==========================================
router.post(
  '/teacher/leaves',
  requireExactRole(['TEACHER']),
  validateRequest(createLeaveSchema),
  LeaveController.submitLeave
);

router.get(
  '/teacher/leaves',
  requireExactRole(['TEACHER']),
  LeaveController.getMyLeaves
);

// Class Teacher reviewing student leaves
router.get(
  '/teacher/student-leaves',
  requireExactRole(['TEACHER']),
  LeaveController.getReviewableLeaves
);

router.patch(
  '/teacher/student-leaves/:id/approve',
  requireExactRole(['TEACHER']),
  validateRequest(reviewLeaveSchema), 
  LeaveController.reviewLeave
);

router.patch(
  '/teacher/student-leaves/:id/reject',
  requireExactRole(['TEACHER']),
  validateRequest(reviewLeaveSchema), 
  LeaveController.reviewLeave
);

// ==========================================
// STAFF APIs
// ==========================================
router.post(
  '/staff/leaves',
  requireExactRole(['TEACHER']),
  validateRequest(createLeaveSchema),
  LeaveController.submitLeave
);

router.get(
  '/staff/leaves',
  requireExactRole(['TEACHER']),
  LeaveController.getMyLeaves
);

// ==========================================
// ADMIN APIs
// ==========================================
router.get(
  '/admin/staff-leaves',
  requireExactRole((['ADMIN', 'SUPER_ADMIN'] as any)),
  LeaveController.getReviewableLeaves
);

router.patch(
  '/admin/staff-leaves/:id/approve',
  requireExactRole((['ADMIN', 'SUPER_ADMIN'] as any)),
  validateRequest(reviewLeaveSchema),
  LeaveController.reviewLeave
);

router.patch(
  '/admin/staff-leaves/:id/reject',
  requireExactRole((['ADMIN', 'SUPER_ADMIN'] as any)),
  validateRequest(reviewLeaveSchema),
  LeaveController.reviewLeave
);

// ==========================================
// ADMIN REPORTS & STATISTICS
// ==========================================
router.get(
  '/admin/leaves/statistics',
  requireExactRole((['ADMIN', 'SUPER_ADMIN'] as any)),
  LeaveReportController.getStatistics
);

router.get(
  '/admin/leaves/report',
  requireExactRole((['ADMIN', 'SUPER_ADMIN'] as any)),
  LeaveReportController.getReport
);

export default router;