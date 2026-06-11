import { Prisma, PasswordResetToken, User } from '@prisma/client';
import { prisma } from '../../../database/prisma';

// Define a custom type that includes the related user
export type PasswordResetTokenWithUser = PasswordResetToken & { user: User };

export class PasswordResetTokenRepository {
  async create(data: Prisma.PasswordResetTokenUncheckedCreateInput): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({
      data,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenWithUser | null> {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });
  }

  async markAsUsed(id: string): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }

  async invalidateAllForUser(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.passwordResetToken.updateMany({
      where: {
        userId,
        used: false,
      },
      data: { used: true },
    });
  }
}