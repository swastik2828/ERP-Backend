import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export const validateRequest = (schema: ZodSchema) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      const data = validatedData as {
        body?: Record<string, unknown>;
        query?: Record<string, unknown>;
        params?: Record<string, string>;
      };

      // Body can safely be replaced
      if (data.body) {
        req.body = data.body;
      }

      // Query should be merged, not reassigned
      if (data.query) {
        Object.assign(req.query, data.query);
      }

      // Params should be merged, not reassigned
      if (data.params) {
        Object.assign(req.params, data.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.issues
          .map((issue) => issue.message)
          .join(', ');

        return next(
          new AppError(
            `Validation failed: ${errorMessage}`,
            400,
            'VALIDATION_ERROR'
          )
        );
      }

      next(error);
    }
  };
};