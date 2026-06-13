import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware';
import { requireTenantIsolation } from '../../../middlewares/tenant.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { createUserSchema, queryUsersSchema, updateUserSchema } from '../validators/user.validator';

const router = Router();

// Dependency Injection
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Global Middlewares for this module
router.use(requireAuth);
router.use(requireTenantIsolation);

// Endpoints
router.post(
  '/', 
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), 
  validateRequest(createUserSchema), 
  userController.createUser
);

router.get(
  '/', 
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN']), 
  validateRequest(queryUsersSchema), 
  userController.getUsers
);

router.patch(
  '/:id', 
  requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), 
  validateRequest(updateUserSchema), 
  userController.updateUser
);

export default router;