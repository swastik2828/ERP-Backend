import { AcknowledgmentStatus } from '@prisma/client';
import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import { NoticeAuditRepository } from '../repositories/notice-audit.repository';

export class InteractionService {
  constructor(private auditRepo: NoticeAuditRepository) {}

  async markAsRead(schoolId: string, noticeId: string, userId: string, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.noticeReadReceipt.findUnique({
      where: { noticeId_userId: { noticeId, userId } },
    });
    if (existing) return existing;

    return prisma.noticeReadReceipt.create({
      data: { schoolId, noticeId, userId, ipAddress, userAgent },
    });
  }

  async acknowledgeNotice(schoolId: string, noticeId: string, userId: string, dto: { remarks?: string, signatureUrl?: string }, ipAddress?: string, userAgent?: string) {
    const notice = await prisma.notice.findUnique({ where: { id: noticeId } });
    
    if (!notice || notice.schoolId !== schoolId || notice.deletedAt) {
      throw new AppError('Notice not found', 404);
    }
    if (!notice.requiresAcknowledgment) {
      throw new AppError('This notice does not require acknowledgment', 400);
    }

    const existingAck = await prisma.noticeAcknowledgment.findUnique({
      where: { noticeId_userId: { noticeId, userId } }
    });

    if (existingAck && existingAck.status === AcknowledgmentStatus.ACKNOWLEDGED) {
      throw new AppError('Already acknowledged', 400);
    }

    let remarks = dto.remarks || '';
    if (notice.acknowledgmentDeadline && new Date() > notice.acknowledgmentDeadline) {
      remarks = `[LATE_ACKNOWLEDGED] ${remarks}`.trim();
    }

    const ack = await prisma.noticeAcknowledgment.upsert({
      where: { noticeId_userId: { noticeId, userId } },
      create: { schoolId, noticeId, userId, status: AcknowledgmentStatus.ACKNOWLEDGED, acknowledgedAt: new Date(), remarks, signatureUrl: dto.signatureUrl, ipAddress, userAgent },
      update: { status: AcknowledgmentStatus.ACKNOWLEDGED, acknowledgedAt: new Date(), remarks, signatureUrl: dto.signatureUrl, ipAddress, userAgent }
    });

    await this.auditRepo.logAction({ schoolId, noticeId, action: 'ACKNOWLEDGE', actorId: userId, actorRole: 'USER' });
    return ack;
  }
}