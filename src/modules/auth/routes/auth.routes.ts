import { Router } from 'express';

// Repositories
import { AuthUserRepository } from '../repositories/auth-user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';

// Services
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { PasswordService } from '../services/password.service';

// Controllers
import { AuthController } from '../controllers/auth.controller';
import { SessionController } from '../controllers/session.controller';

// Middlewares & Validators
import { validateRequest } from '../../../middlewares/validation.middleware';
import { requireAuth } from '../../../middlewares/auth.middleware';
import {
  loginSchema, refreshTokenSchema, changePasswordSchema,
  resetPasswordRequestSchema, resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

// Dependency Injection Wiring
const authUserRepository = new AuthUserRepository();
const refreshTokenRepository = new RefreshTokenRepository();
const passwordResetTokenRepository = new PasswordResetTokenRepository();

const authService = new AuthService(authUserRepository, refreshTokenRepository);
const sessionService = new SessionService(refreshTokenRepository);
const passwordService = new PasswordService(authUserRepository, passwordResetTokenRepository, sessionService);

const authController = new AuthController(authService, passwordService);
const sessionController = new SessionController(sessionService);

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', validateRequest(refreshTokenSchema), authController.refreshToken);
router.post('/logout', validateRequest(refreshTokenSchema), authController.logout);
router.post('/reset-password-request', validateRequest(resetPasswordRequestSchema), authController.resetPasswordRequest);
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword);

// ==========================================
// PROTECTED ROUTES
// ==========================================
router.use(requireAuth); 

router.get('/me', authController.getCurrentUser);
router.post('/change-password', validateRequest(changePasswordSchema), authController.changePassword);

router.get('/sessions', sessionController.getSessions);
router.delete('/sessions/:sessionId', sessionController.revokeSession);
router.delete('/sessions', sessionController.revokeAllSessions);

export default router;