// src/modules/attendance/routes/attendance.routes.ts
import { Router } from 'express';
import { StudentAttendanceController } from '../controllers/student-attendance.controller';
import { TeacherAttendanceController } from '../controllers/teacher-attendance.controller';
import { AttendanceReportController } from '../controllers/attendance-report.controller';
import { attendanceReportQuerySchema } from '../validators/attendance.validator';

// Use the correct middleware names from your project
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';

import {
  bulkStudentAttendanceSchema,
  updateAttendanceSchema,
  teacherCheckInSchema,
  teacherCheckOutSchema
} from '../validators/attendance.validator';
import { Role } from '@prisma/client';

const router = Router();

// Apply authentication
router.use(requireAuth);

// ==========================================
// STUDENT ATTENDANCE ROUTES
// ==========================================

router.post(
  '/students/bulk',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN, Role.TEACHER]),
  validateRequest(bulkStudentAttendanceSchema),
  StudentAttendanceController.markBulkAttendance
);

router.patch(
  '/students/:id',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DATA_ENTRY_ADMIN]),
  validateRequest(updateAttendanceSchema),
  StudentAttendanceController.updateAttendance
);

// ==========================================
// TEACHER ATTENDANCE ROUTES
// ==========================================

router.post(
  '/teachers/check-in',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER]),
  validateRequest(teacherCheckInSchema),
  TeacherAttendanceController.checkIn
);

router.post(
  '/teachers/check-out',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER]),
  validateRequest(teacherCheckOutSchema),
  TeacherAttendanceController.checkOut
);

// ==========================================
// REPORTING & ANALYTICS ROUTES
// ==========================================

// Students/Parents can view history & summary, Admins/Teachers can view all.
router.get(
  '/students/:studentId/history',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT]),
  AttendanceReportController.getStudentHistory
);

router.get(
  '/students/:studentId/summary',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT]),
  AttendanceReportController.getStudentSummary
);

// Class Attendance Sheet (Restricted to Admins and Teachers)
router.get(
  '/class/:classId/date/:date',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER]),
  AttendanceReportController.getClassSheet
);

// Defaulter Report (Restricted to Admins)
router.get(
  '/reports/defaulters',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]),
  validateRequest(attendanceReportQuerySchema),
  AttendanceReportController.getDefaulters
);

export default router;