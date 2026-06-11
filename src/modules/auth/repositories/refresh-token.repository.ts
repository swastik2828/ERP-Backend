import { Prisma, RefreshToken, User } from '@prisma/client';
import { prisma } from '../../../database/prisma';

// Define a custom type that includes the related user
export type RefreshTokenWithUser = RefreshToken & { user: User };

export class RefreshTokenRepository {
  async create(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenWithUser | null> {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: true, 
      },
    });
  }

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async revokeById(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: { revoked: true },
    });
  }

  async revokeAllForUser(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
      },
      data: { revoked: true },
    });
  }

  async deleteById(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.delete({
      where: { id },
    });
  }
}