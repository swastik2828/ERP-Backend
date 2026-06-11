import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  data: T,
  message?: string,
  meta?: Record<string, unknown>
): Response => {
  const payload: SuccessResponse<T> = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errorCode?: string
): Response => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: errorCode || 'INTERNAL_ERROR',
    },
  });
};