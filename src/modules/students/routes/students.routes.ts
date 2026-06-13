import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { StudentService } from '../services/student.service';
import { StudentRepository } from '../repositories/student.repository';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware';
import { requireTenantIsolation } from '../../../middlewares/tenant.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { admissionSchema } from '../validators/admission.validator';

const router = Router();

const studentRepository = new StudentRepository();
const studentService = new StudentService(studentRepository);
const studentController = new StudentController(studentService);

// Global protection: Only authenticated users mapped to a specific school can access
router.use(requireAuth);
router.use(requireTenantIsolation);

router.post(
  '/admission', 
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN']), 
  validateRequest(admissionSchema), 
  studentController.admitStudent
);

router.get(
  '/', 
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'DATA_ENTRY_ADMIN']), 
  studentController.getStudents
);

export default router;