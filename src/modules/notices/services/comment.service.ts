import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import { NoticeAuditRepository } from '../repositories/notice-audit.repository';

export class CommentService {
  constructor(private auditRepo: NoticeAuditRepository) {}

  async addComment(schoolId: string, noticeId: string, userId: string, content: string, parentCommentId?: string) {
    const notice = await prisma.notice.findUnique({ where: { id: noticeId } });
    if (!notice || notice.schoolId !== schoolId) throw new AppError('Notice not found', 404);
    
    if (!notice.allowComments) {
      throw new AppError('Comments are disabled for this notice', 403);
    }

    return prisma.noticeComment.create({
      data: { schoolId, noticeId, userId, content, parentCommentId }
    });
  }

  async editComment(schoolId: string, commentId: string, userId: string, newContent: string) {
    const comment = await prisma.noticeComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.schoolId !== schoolId || comment.isDeleted) throw new AppError('Comment not found', 404);
    if (comment.userId !== userId) throw new AppError('You can only edit your own comments', 403);

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (comment.createdAt < fifteenMinutesAgo) {
      throw new AppError('Comments can only be edited within 15 minutes of creation', 400);
    }

    return prisma.noticeComment.update({
      where: { id: commentId },
      data: { content: newContent, isEdited: true, editedAt: new Date() }
    });
  }

  async deleteComment(schoolId: string, commentId: string, actorId: string, actorRole: string) {
    const comment = await prisma.noticeComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError('Comment not found', 404);
    
    const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(actorRole);
    if (comment.userId !== actorId && !isAdmin) {
      throw new AppError('Not authorized to delete this comment', 403);
    }

    const deletedComment = await prisma.noticeComment.update({
      where: { id: commentId },
      data: { isDeleted: true, content: '[deleted]', deletedAt: new Date(), deletedBy: actorId }
    });

    await this.auditRepo.logAction({ schoolId, noticeId: comment.noticeId, action: 'DELETE_COMMENT', actorId, actorRole, oldValues: { commentId } });
    return deletedComment;
  }
}