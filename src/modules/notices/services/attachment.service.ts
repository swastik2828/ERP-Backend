import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import crypto from 'crypto';

export class AttachmentService {
  
  // Simulated file upload handling based on BR-011 rules.
  // In a real scenario, the file stream is passed from multer to an S3 bucket here.
  async uploadAttachment(schoolId: string, noticeId: string, uploaderId: string, file: Express.Multer.File) {
    const notice = await prisma.notice.findUnique({ where: { id: noticeId } });
    if (!notice || notice.schoolId !== schoolId) {
      throw new AppError('ERR_NOTICE_NOT_FOUND: Notice not found', 404);
    }

    // BR-011: File Constraints
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new AppError('ERR_INVALID_FILE_TYPE: File type not permitted', 400);
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new AppError('ERR_FILE_TOO_LARGE: File exceeds 10MB limit', 400);
    }

    // BR-011: Hash generation
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Simulate saving file to storage and getting a URL
    const fileUrl = `/uploads/notices/${schoolId}/${noticeId}/${Date.now()}-${file.originalname}`;

    return prisma.noticeAttachment.create({
      data: {
        schoolId,
        noticeId,
        fileName: `${Date.now()}-${file.originalname}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileUrl,
        fileHash: hash,
        uploadedBy: uploaderId,
      }
    });
  }

  async deleteAttachment(schoolId: string, noticeId: string, attachmentId: string, actorId: string, actorRole: string) {
    const attachment = await prisma.noticeAttachment.findFirst({
      where: { id: attachmentId, noticeId, schoolId }
    });

    if (!attachment) {
      throw new AppError('ERR_ATTACHMENT_NOT_FOUND: Attachment not found', 404);
    }

    const notice = await prisma.notice.findUnique({ where: { id: noticeId } });
    if (notice?.createdBy !== actorId && !['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(actorRole)) {
      throw new AppError('ERR_FORBIDDEN: You do not have permission to delete this attachment', 403);
    }

    // Delete record from DB (and ideally trigger S3 deletion event)
    await prisma.noticeAttachment.delete({ where: { id: attachmentId } });
  }
}