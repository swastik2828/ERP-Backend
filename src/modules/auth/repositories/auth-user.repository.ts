import { User, AccountStatus } from '@prisma/client';
import prisma from '../../../database/prisma';

export class AuthUserRepository {
  /**
   * Used strictly for login verification.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Used for session validation and password changes.
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Centralized security updates for failed/successful logins.
   */
  async updateSecurityState(
    id: string, 
    failedAttempts: number, 
    status: AccountStatus, 
    lockedUntil: Date | null,
    isSuccess: boolean = false
  ): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { 
        failedLoginAttempts: failedAttempts, 
        accountStatus: status, 
        lockedUntil, 
        lastLoginAt: isSuccess ? new Date() : undefined 
      },
    });
  }

  /**
   * Updates password and clears the temporary password flag.
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { 
        passwordHash,
        temporaryPasswordRequired: false
      },
    });
  }
}