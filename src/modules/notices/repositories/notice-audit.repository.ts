import { Prisma } from '@prisma/client';
import prisma from '../../../database/prisma';
import crypto from 'crypto';

export class NoticeAuditRepository {
  async logAction(data: {
    schoolId: string;
    noticeId: string;
    action: string;
    actorId: string;
    actorRole: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const correlationId = crypto.randomUUID();
    return prisma.noticeAudit.create({
      data: {
        ...data,
        correlationId,
        oldValues: data.oldValues ? (data.oldValues as Prisma.InputJsonValue) : undefined,
        newValues: data.newValues ? (data.newValues as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}