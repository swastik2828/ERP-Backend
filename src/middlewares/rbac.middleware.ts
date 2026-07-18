import { Request, Response, NextFunction } from 'express';

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => { // <-- added : void
    const userRole = (req as any).user?.role;
    
    if (!roles.includes(userRole)) {
      res.status(403).json({ error: 'Forbidden' });
      return; // <-- Explicit empty return instead of returning the res object
    }
    
    next();
  };
};