import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware'; // FIXED: Changed import
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.post(
  '/:id/promote',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), // FIXED
  StudentController.promote
);

router.post(
  '/:id/transfer',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), // FIXED
  StudentController.transfer
);

router.post(
  '/:id/withdraw',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), // FIXED
  StudentController.withdraw
);

router.post(
  '/:id/graduate',
  requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), // FIXED
  StudentController.graduate
);

router.post('/', requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), StudentController.create);

export default router;