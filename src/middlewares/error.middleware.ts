import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { sendError } from '../utils/response.util';
import { env } from '../config/env';
import { Prisma } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const globalErrorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  if (env.NODE_ENV === 'development') {
    console.error(`[Error] ${err.name}: ${err.message}`);
    console.error(err.stack);
  }

  // Handle expected operational errors
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.errorCode);
    return;
  }

  // Handle Prisma Database Errors securely without leaking DB internals
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendError(res, 409, 'A resource with that unique data already exists', 'CONFLICT_ERROR');
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 404, 'Requested database record not found', 'RECORD_NOT_FOUND');
      return;
    }
    sendError(res, 400, 'Invalid database operation', 'DB_BAD_REQUEST');
    return;
  }

  // Handle Unexpected/Unhandled Errors
  const statusCode = 500;
  const message = env.NODE_ENV === 'production' 
    ? 'An unexpected internal server error occurred' 
    : err.message;

  sendError(res, statusCode, message, 'INTERNAL_SERVER_ERROR');
};