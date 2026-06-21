import { Router } from 'express';
import { ParentController } from '../controllers/parent.controller';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.post('/', requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), ParentController.create);
router.post('/:id/link-student', requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), ParentController.linkStudent);
router.get('/', requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), ParentController.getParents);
router.put('/:id', requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), ParentController.update);
router.delete('/:id', requireExactRole([Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]), ParentController.delete);

export default router;