import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { PasswordService } from '../services/password.service';
import { sendSuccess } from '../../../utils/response.util';
import { UnauthorizedError } from '../../../errors/AuthError';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService
  ) {}

  /**
   * POST /api/v1/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const tokens = await this.authService.login(req.body, ipAddress, userAgent);

      sendSuccess(res, 200, tokens, 'Authentication successful');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/refresh
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const tokens = await this.authService.refreshToken(req.body, ipAddress, userAgent);

      sendSuccess(res, 200, tokens, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/logout
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.logout(req.body.refreshToken);
      sendSuccess(res, 200, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/change-password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      await this.passwordService.changePassword(user.id, req.body);
      sendSuccess(res, 200, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/reset-password-request
   */
  resetPasswordRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.passwordService.requestPasswordReset(req.body);
      // We always return success to prevent email enumeration attacks
      sendSuccess(res, 200, null, 'If that email exists, a reset link has been sent');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/reset-password
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.passwordService.resetPassword(req.body);
      sendSuccess(res, 200, null, 'Password has been reset successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/auth/me
   */
  getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      sendSuccess(res, 200, { user }, 'Current user retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}