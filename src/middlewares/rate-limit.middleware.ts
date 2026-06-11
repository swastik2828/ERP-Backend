import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

// Global API Rate Limiter
export const globalRateLimiter = rateLimit({
  // Wrap env variables in Number() to guarantee strict number typing
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS),
  max: Number(env.RATE_LIMIT_MAX_REQUESTS),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Too many requests from this IP, please try again later.', 429, 'RATE_LIMIT_EXCEEDED'));
  },
});

// Strict Rate Limiter for Sensitive Endpoints (Login, Password Reset)
// Mitigates Dictionary / Brute-Force Attacks
export const authStrictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 failed/successful login requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts towards the strict limit
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Too many authentication attempts from this IP, please try again after 15 minutes.', 429, 'BRUTE_FORCE_DETECTED'));
  },
});

// Password Reset Request Limiter (Prevents Email Spam/Enumeration)
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Too many password reset requests. Please check your email or try again later.', 429, 'RESET_LIMIT_EXCEEDED'));
  },
});