import { randomUUID } from 'crypto';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { LoginDto, RefreshTokenDto } from '../dto/auth.dto';
import { InvalidCredentialsError, UnauthorizedError, ForbiddenError } from '../../../errors/AuthError';
import { comparePassword } from '../../../utils/password.util';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../../../utils/jwt.util';
import { TokenResponse } from '../../../types/auth.types';
import prisma from '../../../database/prisma'; // <-- ADDED PRISMA IMPORT

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository
  ) {}

  /**
   * Authenticates a user and generates a new session footprint.
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<TokenResponse | any> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) throw new InvalidCredentialsError();

    // Check Account Status & Lockout
    if (user.accountStatus === 'INACTIVE' || !user.isActive) {
      throw new ForbiddenError('Account is inactive.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenError(`Account locked. Try again after ${user.lockedUntil.toISOString()}`);
    }

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts and lock if >= 5
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      const status = attempts >= 5 ? 'LOCKED' : user.accountStatus;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockedUntil, accountStatus: status }
      });
      throw new InvalidCredentialsError();
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, accountStatus: 'ACTIVE', lastLoginAt: new Date() }
    });

    // PRD Requirement: Force password change on first login
    if (user.temporaryPasswordRequired) {
      return { 
        requiresPasswordChange: true, 
        message: "Please change your temporary password to continue.",
        tempToken: generateAccessToken({ sub: user.id, email: user.email, role: user.role, schoolId: user.schoolId }) 
      };
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: { actorId: user.id, action: 'LOGIN', entityType: 'USER', entityId: user.id, ipAddress }
    });

    return this.generateSession(user.id, user.email, user.role, user.schoolId, ipAddress, userAgent);
  }

  /**
   * Securely rotates a refresh token.
   * Implements Refresh Token Reuse Detection (OWASP Recommendation).
   */
  async refreshToken(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string): Promise<TokenResponse> {
    const decoded = verifyRefreshToken(dto.refreshToken);
    const incomingTokenHash = hashToken(dto.refreshToken);

    const storedToken = await this.refreshTokenRepository.findByTokenHash(incomingTokenHash);

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token session');
    }

    // Refresh Token Reuse Detection:
    if (storedToken.revoked) {
      await this.refreshTokenRepository.revokeAllForUser(decoded.sub);
      throw new UnauthorizedError('Security Alert: Token reuse detected. All active sessions have been terminated.');
    }

    // Valid rotation: Mark the current token as revoked
    await this.refreshTokenRepository.revokeById(storedToken.id);

    const user = storedToken.user;
    if (!user.isActive) {
      throw new ForbiddenError('Account has been deactivated');
    }

    return this.generateSession(user.id, user.email, user.role, user.schoolId, ipAddress, userAgent);
  }

  /**
   * Terminates the current session by revoking the specific refresh token.
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (storedToken && !storedToken.revoked) {
      await this.refreshTokenRepository.revokeById(storedToken.id);
    }
  }

  /**
   * Helper method to generate access/refresh token pairs and store the session footprint.
   */
  private async generateSession(
    userId: string,
    email: string,
    role: any,
    schoolId: string | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenResponse> {
    const tokenId = randomUUID();

    const accessToken = generateAccessToken({
      sub: userId,
      email,
      role,
      schoolId,
    });

    const refreshToken = generateRefreshToken({
      sub: userId,
      tokenId,
    });

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

    await this.refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}