import { NoticeStatus, NoticeType } from '@prisma/client';
import { NoticeRepository } from '../repositories/notices.repositories';
import { NoticeAuditRepository } from '../repositories/notice-audit.repository';
import { CreateNoticeDto, UpdateNoticeDto } from '../dtos/notices.dto';
import { AppError } from '../../../errors/AppError';

export class NoticeService {
  constructor(
    private noticeRepo: NoticeRepository,
    private auditRepo: NoticeAuditRepository
  ) {}

  async createNotice(schoolId: string, creatorId: string, creatorRole: string, dto: CreateNoticeDto) {
    const isDuplicate = await this.noticeRepo.checkDuplicate(schoolId, dto.title, dto.type);
    if (isDuplicate) {
      throw new AppError('A similar notice was created recently.', 409);
    }

    const requiresAcknowledgment = dto.type === NoticeType.CIRCULAR ? true : dto.requiresAcknowledgment;

    let status: NoticeStatus = NoticeStatus.DRAFT;
    if (dto.publishAt) {
      if (new Date(dto.publishAt) <= new Date()) {
        throw new AppError('Publish date must be in the future', 400);
      }
      status = NoticeStatus.SCHEDULED;
    }

    const targetsToCreate = dto.targets.map((target: any) => ({
      targetType: target.targetType,
      targetRole: target.targetRole,
      targetClassId: target.targetClassId,
      targetSectionId: target.targetSectionId,
      targetStudentId: target.targetStudentId,
      targetParentId: target.targetParentId,
      targetTeacherId: target.targetTeacherId,
      targetUserId: target.targetUserId,
    }));

    const notice = await this.noticeRepo.create({
      school: { connect: { id: schoolId } },
      creator: { connect: { id: creatorId } },
      title: dto.title,
      content: dto.content,
      summary: dto.summary,
      type: dto.type,
      priority: dto.priority,
      status,
      publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      requiresAcknowledgment,
      acknowledgmentDeadline: dto.acknowledgmentDeadline ? new Date(dto.acknowledgmentDeadline) : null,
      allowComments: dto.allowComments,
      targets: { create: targetsToCreate },
      ...(dto.categoryId && { category: { connect: { id: dto.categoryId } } }),
      ...(dto.academicSessionId && { academicSession: { connect: { id: dto.academicSessionId } } }),
    });

    await this.auditRepo.logAction({
      schoolId, noticeId: notice.id, action: 'CREATE', actorId: creatorId, actorRole: creatorRole, newValues: dto,
    });

    return notice;
  }

  async updateNotice(schoolId: string, noticeId: string, actorId: string, actorRole: string, dto: UpdateNoticeDto) {
    const notice = await this.noticeRepo.findById(noticeId, schoolId);
    if (!notice) throw new AppError('Notice not found', 404);
    
    if (notice.createdBy !== actorId && !['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(actorRole)) {
      throw new AppError('Not authorized to update this notice', 403);
    }

    if (notice.status === NoticeStatus.PUBLISHED) {
       throw new AppError('Cannot modify a published notice. Archive and create a new one.', 400);
    }

    const updated = await this.noticeRepo.update(noticeId, {
      ...dto,
      targets: dto.targets ? { deleteMany: {}, create: dto.targets as any } : undefined,
    });

    await this.auditRepo.logAction({ schoolId, noticeId, action: 'UPDATE', actorId, actorRole, oldValues: notice, newValues: dto });
    return updated;
  }

  async deleteNotice(schoolId: string, noticeId: string, actorId: string, actorRole: string) {
    const notice = await this.noticeRepo.findById(noticeId, schoolId);
    if (!notice) throw new AppError('Notice not found', 404);

    if (notice.createdBy !== actorId && !['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(actorRole)) {
      throw new AppError('Not authorized to delete this notice', 403);
    }

    if (notice.status === NoticeStatus.PUBLISHED && !['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(actorRole)) {
      throw new AppError('Cannot delete published notices.', 403);
    }

    const deleted = await this.noticeRepo.update(noticeId, { deletedAt: new Date(), deletedBy: actorId });
    await this.auditRepo.logAction({ schoolId, noticeId, action: 'DELETE', actorId, actorRole });
    return deleted;
  }

  async publishNotice(schoolId: string, noticeId: string, actorId: string, actorRole: string) {
    const notice = await this.noticeRepo.findById(noticeId, schoolId);
    if (!notice) throw new AppError('Notice not found', 404);

    if (notice.status !== NoticeStatus.DRAFT && notice.status !== NoticeStatus.SCHEDULED) {
      throw new AppError('Only draft or scheduled notices can be published', 400);
    }

    const published = await this.noticeRepo.update(noticeId, { status: NoticeStatus.PUBLISHED, publishedAt: new Date() });
    await this.auditRepo.logAction({ schoolId, noticeId, action: 'PUBLISH', actorId, actorRole });
    return published;
  }

  async archiveNotice(schoolId: string, noticeId: string, actorId: string, actorRole: string) {
    const notice = await this.noticeRepo.findById(noticeId, schoolId);
    if (!notice) throw new AppError('Notice not found', 404);

    const archived = await this.noticeRepo.update(noticeId, { status: NoticeStatus.ARCHIVED, archivedAt: new Date() });
    await this.auditRepo.logAction({ schoolId, noticeId, action: 'ARCHIVE', actorId, actorRole });
    return archived;
  }

  async getNoticeById(schoolId: string, noticeId: string, userId: string, userRole: string) {
    const notice = await this.noticeRepo.findById(noticeId, schoolId);
    if (!notice) throw new AppError('Notice not found', 404);

    if (notice.status === NoticeStatus.DRAFT) {
      if (notice.createdBy !== userId && userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') {
        throw new AppError('You do not have permission to view this draft.', 403);
      }
    }

    return notice;
  }

  async pinNotice(schoolId: string, noticeId: string, actorId: string, actorRole: string) {
    const notice = await this.noticeRepo.findById(noticeId, schoolId);
    if (!notice) throw new AppError('ERR_NOTICE_NOT_FOUND',404);
    if (notice.isPinned) throw new AppError('Notice is already pinned', 400);

    const pinnedCount = await this.noticeRepo.countPinnedNotices(schoolId);
    if (pinnedCount >= 5) {
      throw new AppError('Maximum of 5 pinned notices allowed.', 400);
    }

    const updated = await this.noticeRepo.update(noticeId, { isPinned: true });
    await this.auditRepo.logAction({ schoolId, noticeId, action: 'PIN', actorId, actorRole, oldValues: { isPinned: false }, newValues: { isPinned: true } });
    return updated;
  }

  async unpinNotice(schoolId: string, noticeId: string, actorId: string, actorRole: string) {
    const notice = await this.noticeRepo.findById(noticeId, schoolId);
    if (!notice) throw new AppError('Notice not found', 404);
    if (!notice.isPinned) throw new AppError('Notice is not pinned', 400);

    const updated = await this.noticeRepo.update(noticeId, { isPinned: false });
    await this.auditRepo.logAction({ schoolId, noticeId, action: 'UNPIN', actorId, actorRole });
    return updated;
  }
}