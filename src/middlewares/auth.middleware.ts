import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { UnauthorizedError } from '../errors/AuthError';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.header(AUTH_CONSTANTS.AUTHORIZATION_HEADER);

    if (!authHeader || !authHeader.startsWith(AUTH_CONSTANTS.BEARER_PREFIX)) {
      throw new UnauthorizedError('Missing or malformed authorization header');
    }

    const token = authHeader.replace(AUTH_CONSTANTS.BEARER_PREFIX, '');
    
    if (!token) {
      throw new UnauthorizedError('Token not provided');
    }

    const decoded = verifyAccessToken(token);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId,
    };

    next();
  } catch (error) {
    next(error);
  }
};