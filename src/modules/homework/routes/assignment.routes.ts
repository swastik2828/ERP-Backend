import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { AssignmentService } from '../services/assignment.service';
import { AssignmentRepository } from '../repositories/assignment.repository';
// Note: Import your existing middleware here
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/rbac.middleware'; 

const router = Router();

// Dependency Injection wiring
const assignmentRepo = new AssignmentRepository();
const assignmentService = new AssignmentService(assignmentRepo);
const assignmentController = new AssignmentController(assignmentService);

// Apply tenant-aware authentication middleware to all routes
router.use(requireAuth);

// Routes
router.post(
  '/',
  requireRole(['TEACHER', 'ADMIN']), // RBAC enforcement
  assignmentController.createAssignment
);

router.post(
  '/:id/publish',
  requireRole(['TEACHER', 'ADMIN']),
  assignmentController.publishAssignment
);

router.delete(
  '/:id',
  requireRole(['TEACHER', 'ADMIN']),
  assignmentController.deleteAssignment
);

export default router;