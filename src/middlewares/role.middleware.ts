import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ROLE_HIERARCHY } from '../constants/auth.constants';
import { ForbiddenError, UnauthorizedError } from '../errors/AuthError';

export const requireRole = (minimumRole: Role) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedError('Authentication required to verify roles');
      }

      const userRoleLevel = ROLE_HIERARCHY[user.role];
      const requiredRoleLevel = ROLE_HIERARCHY[minimumRole];

      if (userRoleLevel < requiredRoleLevel) {
        throw new ForbiddenError(`Access denied. Requires ${minimumRole} privileges or higher.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireExactRole = (allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedError('Authentication required to verify roles');
      }

      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError('Access denied. Your specific role is not authorized for this action.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};