import { Prisma, User } from '@prisma/client';
import { prisma } from '../../../database/prisma';

export class UserRepository {
  /**
   * Finds a user by their globally unique email address.
   * Used primarily for the initial login step before tenant context is established.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Finds a user by ID, enforcing tenant isolation if a schoolId is provided.
   */
  async findById(id: string, schoolId?: string | null): Promise<User | null> {
    const whereClause: Prisma.UserWhereInput = { id };

    // Enforce repository-level tenant isolation
    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    return prisma.user.findFirst({
      where: whereClause,
    });
  }

  /**
   * Updates the user's password hash securely.
   */
  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /**
   * Updates the last login timestamp for audit and security tracking.
   */
  async updateLastLogin(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}