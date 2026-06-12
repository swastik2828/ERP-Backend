import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireExactRole } from '../../../middlewares/role.middleware'; // <-- IMPORTED requireExactRole
import { requireTenantIsolation } from '../../../middlewares/tenant.middleware';

const router = Router();
const userController = new UserController();

// Apply global middlewares
router.use(requireAuth);
router.use(requireTenantIsolation);

// POST /api/v1/users (SUPER_ADMIN or SCHOOL_ADMIN)
// FIXED: Using requireExactRole and passing an array instead of two arguments
router.post('/', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), userController.createUser);

// GET /api/v1/users (Supports pagination, role filter, search)
// FIXED: Added underscores to unused variables
router.get('/', async (_req, _res, _next) => {
    // TODO: Implementation: prisma.user.findMany with pagination and filters
});

// GET /api/v1/users/:id
router.get('/:id', async (_req, _res, _next) => {
    // TODO: Implementation: Fetch single user
});

// PATCH /api/v1/users/:id
router.patch('/:id', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), async (_req, _res, _next) => {
    // TODO: Implementation: Update user data
});

// PATCH /api/v1/users/:id/deactivate
router.patch('/:id/deactivate', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), async (_req, _res, _next) => {
    // TODO: Implementation: Update isActive to false, accountStatus to INACTIVE
});

// PATCH /api/v1/users/:id/activate
router.patch('/:id/activate', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), async (_req, _res, _next) => {
     // TODO: Implementation: Update isActive to true, accountStatus to ACTIVE
});

// POST /api/v1/users/:id/reset-password
router.post('/:id/reset-password', requireExactRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), async (_req, _res, _next) => {
     // TODO: Implementation: Generate new temporary password, set temporaryPasswordRequired=true
});

export default router;