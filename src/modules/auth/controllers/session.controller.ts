import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';
import { sendSuccess } from '../../../utils/response.util';
import { UnauthorizedError } from '../../../errors/AuthError';

export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * GET /api/v1/auth/sessions
   */
  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const sessions = await this.sessionService.getUserSessions(user.id);
      sendSuccess(res, 200, { sessions }, 'Active sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/auth/sessions/:sessionId
   */
  revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      // Explicitly assert as string to satisfy strict TypeScript definitions
      const sessionId = req.params.sessionId as string;

      await this.sessionService.revokeSession(user.id, sessionId);
      sendSuccess(res, 200, null, 'Session revoked successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/auth/sessions
   */
  revokeAllSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      await this.sessionService.revokeAllSessions(user.id);
      sendSuccess(res, 200, null, 'All sessions revoked successfully');
    } catch (error) {
      next(error);
    }
  };
}