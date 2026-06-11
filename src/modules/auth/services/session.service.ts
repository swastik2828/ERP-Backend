import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { AppError } from '../../../errors/AppError';

export class SessionService {
  constructor(private readonly refreshTokenRepository: RefreshTokenRepository) {}

  /**
   * Retrieves all active, non-revoked sessions for a user.
   * Sanitizes the output to hide internal database IDs and hashes.
   */
  async getUserSessions(userId: string) {
    const sessions = await this.refreshTokenRepository.findActiveByUserId(userId);

    return sessions.map((session) => ({
      sessionId: session.id,
      userAgent: session.userAgent || 'Unknown Device',
      ipAddress: session.ipAddress || 'Unknown IP',
      createdAt: session.createdAt,
      lastActive: session.createdAt, // Since tokens are rotated on every use, creation time is last active time
    }));
  }

  /**
   * Revokes a specific session by its ID. Ensures the session belongs to the requesting user.
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    // In a production environment, we should verify the session belongs to the user
    // before revoking to prevent IDOR (Insecure Direct Object Reference).
    const activeSessions = await this.refreshTokenRepository.findActiveByUserId(userId);
    const sessionExists = activeSessions.some((s) => s.id === sessionId);

    if (!sessionExists) {
      throw new AppError('Session not found or already revoked', 404, 'SESSION_NOT_FOUND');
    }

    await this.refreshTokenRepository.revokeById(sessionId);
  }

  /**
   * Globally signs the user out of all devices.
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }
}