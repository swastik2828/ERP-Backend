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

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository
  ) {}

  /**
   * Authenticates a user and generates a new session footprint.
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<TokenResponse> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account has been deactivated. Please contact your school administrator.');
    }

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    await this.userRepository.updateLastLogin(user.id);

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
    // If the token exists but is marked as revoked, a malicious actor (or desynced client) 
    // is attempting to use an already-rotated token.
    // ACTION: Revoke ALL sessions for this user immediately to secure the account.
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

    // We never store the raw refresh token, only its SHA-256 hash.
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days alignment with env default

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