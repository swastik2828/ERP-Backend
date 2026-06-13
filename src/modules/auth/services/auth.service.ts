import { randomUUID } from 'crypto';
import { AuthUserRepository } from '../repositories/auth-user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { LoginDto, RefreshTokenDto } from '../dto/auth.dto';
import { InvalidCredentialsError, UnauthorizedError, ForbiddenError } from '../../../errors/AuthError';
import { comparePassword } from '../../../utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashToken } from '../../../utils/jwt.util';
import { TokenResponse } from '../../../types/auth.types';
import prisma from '../../../database/prisma'; 

export class AuthService {
  constructor(
    private readonly authUserRepository: AuthUserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<TokenResponse | any> {
    const user = await this.authUserRepository.findByEmail(dto.email);

    if (!user) throw new InvalidCredentialsError();

    // 1. Account Status & Lockout Verification
    if (user.accountStatus === 'INACTIVE' || !user.isActive) {
      throw new ForbiddenError('Account is inactive.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenError(`Account locked. Try again after ${user.lockedUntil.toISOString()}`);
    }

    // 2. Credential Verification
    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      const status = attempts >= 5 ? 'LOCKED' : user.accountStatus;
      
      await this.authUserRepository.updateSecurityState(user.id, attempts, status, lockedUntil);
      throw new InvalidCredentialsError();
    }

    // 3. Reset Security State on Success
    await this.authUserRepository.updateSecurityState(user.id, 0, 'ACTIVE', null, true);

    // 4. PRD Requirement: Force password change on first login
    if (user.temporaryPasswordRequired) {
      return { 
        requiresPasswordChange: true, 
        message: "Please change your temporary password to continue.",
        tempToken: generateAccessToken({ sub: user.id, email: user.email, role: user.role, schoolId: user.schoolId }) 
      };
    }

    // 5. Audit Logging
    await prisma.auditLog.create({
      data: { actorId: user.id, action: 'LOGIN', entityType: 'USER', entityId: user.id, ipAddress }
    });

    return this.generateSession(user.id, user.email, user.role, user.schoolId, ipAddress, userAgent);
  }

  async refreshToken(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string): Promise<TokenResponse> {
    const decoded = verifyRefreshToken(dto.refreshToken);
    const incomingTokenHash = hashToken(dto.refreshToken);

    const storedToken = await this.refreshTokenRepository.findByTokenHash(incomingTokenHash);

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token session');
    }

    // Refresh Token Reuse Detection (OWASP Standard)
    if (storedToken.revoked) {
      await this.refreshTokenRepository.revokeAllForUser(decoded.sub);
      throw new UnauthorizedError('Security Alert: Token reuse detected. All active sessions have been terminated.');
    }

    await this.refreshTokenRepository.revokeById(storedToken.id);

    const user = storedToken.user;
    if (!user.isActive || user.accountStatus !== 'ACTIVE') {
      throw new ForbiddenError('Account has been deactivated or locked');
    }

    return this.generateSession(user.id, user.email, user.role, user.schoolId, ipAddress, userAgent);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (storedToken && !storedToken.revoked) {
      await this.refreshTokenRepository.revokeById(storedToken.id);
    }
  }

  private async generateSession(
    userId: string, email: string, role: any, schoolId: string | null, ipAddress?: string, userAgent?: string
  ): Promise<TokenResponse> {
    const tokenId = randomUUID();
    const accessToken = generateAccessToken({ sub: userId, email, role, schoolId });
    const refreshToken = generateRefreshToken({ sub: userId, tokenId });

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

    await this.refreshTokenRepository.create({
      userId, tokenHash, expiresAt, ipAddress, userAgent,
    });

    return { accessToken, refreshToken };
  }
}