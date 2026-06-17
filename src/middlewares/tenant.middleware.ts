import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AuthError';

export const requireTenantIsolation = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError('Authentication required to verify tenant access');
    }

    // SUPER_ADMIN has global access across all tenants
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Users must belong to a school
    if (!user.schoolId) {
      throw new ForbiddenError('User is not associated with any school tenant');
    }

    // Check if the route contains a schoolId parameter (e.g., /api/v1/schools/:schoolId/...)
    const requestedSchoolId = req.params.schoolId || req.body.schoolId || req.query.schoolId;

    if (requestedSchoolId && requestedSchoolId !== user.schoolId) {
      throw new ForbiddenError('Tenant isolation violation. Cross-school access is strictly forbidden.');
    }

    // Inject the user's school ID into the request body for safe downstream processing
    // This prevents malicious overwrites of the schoolId in the body
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      req.body.schoolId = user.schoolId;
    }

    next();
  } catch (error) {
    next(error);
  }
};