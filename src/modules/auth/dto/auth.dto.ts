import { z } from 'zod';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

export type LoginDto = z.infer<typeof loginSchema>['body'];
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>['body'];
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>['body'];
export type ResetPasswordRequestDto = z.infer<typeof resetPasswordRequestSchema>['body'];
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>['body'];