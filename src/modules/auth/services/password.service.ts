import { randomBytes } from 'crypto';
import { AuthUserRepository } from '../repositories/auth-user.repository';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { SessionService } from './session.service';
import { ChangePasswordDto, ResetPasswordRequestDto, ResetPasswordDto } from '../dto/auth.dto';
import { AppError } from '../../../errors/AppError';
import { InvalidCredentialsError } from '../../../errors/AuthError';
import { comparePassword, hashPassword } from '../../../utils/password.util';
import { hashToken } from '../../../utils/jwt.util';
import { env } from '../../../config/env';

export class PasswordService {
  constructor(
    // Change UserRepository to AuthUserRepository
    private readonly authUserRepository: AuthUserRepository, 
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly sessionService: SessionService
  ) {}

  /**
   * Changes the password for an authenticated user.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.authUserRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isCurrentPasswordValid = await comparePassword(dto.currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      throw new InvalidCredentialsError('Incorrect current password');
    }

    const newPasswordHash = await hashPassword(dto.newPassword);
    await this.authUserRepository.updatePassword(userId, newPasswordHash);

    // Security Standard: Revoke all other active sessions when a password is changed
    await this.sessionService.revokeAllSessions(userId);
  }

  /**
   * Initiates the password reset flow by generating a secure one-time-use token.
   */
  async requestPasswordReset(dto: ResetPasswordRequestDto): Promise<void> {
    const user = await this.authUserRepository.findByEmail(dto.email);

    // Security Standard: Do not reveal whether an email exists in the system (Prevent enumeration)
    if (!user || !user.isActive) {
      return; 
    }

    // Invalidate any previously pending reset requests for this user
    await this.passwordResetTokenRepository.invalidateAllForUser(user.id);

    // Generate a secure 32-byte crypto random hex string (64 characters)
    const rawResetToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawResetToken);

    // Convert string expiration (e.g., "1h") to a Date object. 
    // For exactness in this enterprise app, we safely assume 1 hour = 3600000ms.
    const expiresAt = new Date(Date.now() + 3600000); 

    await this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // In a full production environment, we would integrate an Email Service here:
    // await this.emailService.sendPasswordResetEmail(user.email, rawResetToken);
    
    if (env.NODE_ENV === 'development') {
      console.log(`[DEV ONLY] Password Reset Token for ${user.email}: ${rawResetToken}`);
    }
  }

  /**
   * Validates the reset token and updates the user's password securely.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const incomingTokenHash = hashToken(dto.token);
    const storedToken = await this.passwordResetTokenRepository.findByTokenHash(incomingTokenHash);

    if (!storedToken) {
      throw new AppError('Invalid or expired password reset token', 400, 'INVALID_RESET_TOKEN');
    }

    if (storedToken.used) {
      throw new AppError('This password reset token has already been used', 400, 'TOKEN_ALREADY_USED');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AppError('Password reset token has expired', 400, 'TOKEN_EXPIRED');
    }

    const user = storedToken.user;
    if (!user.isActive) {
      throw new AppError('Account has been deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Process the password update
    const newPasswordHash = await hashPassword(dto.newPassword);
    await this.authUserRepository.updatePassword(user.id, newPasswordHash);

    // Mark the token as used to prevent replay attacks
    await this.passwordResetTokenRepository.markAsUsed(storedToken.id);

    // Security Standard: Revoke all active sessions upon password reset
    await this.sessionService.revokeAllSessions(user.id);
  }
}