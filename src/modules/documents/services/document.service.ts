import { DocumentVerificationStatus } from '@prisma/client';
import { prisma } from '../../../database/prisma';

export class DocumentService {
  /**
   * Records a new document upload [cite: 203-209].
   */
  async uploadDocument(studentId: string, payload: any, auditUserId: string) {
    return prisma.studentDocument.create({
      data: {
        studentId,
        documentName: payload.documentName,
        documentType: payload.documentType, // e.g., AADHAAR, TRANSFER_CERTIFICATE
        fileUrl: payload.fileUrl,           // Assumes file is already uploaded to S3/Cloud Storage
        expiryDate: payload.expiryDate,
        uploadedBy: auditUserId,
        verificationStatus: DocumentVerificationStatus.PENDING
      }
    });
  }

  /**
   * Updates document verification status [cite: 210-214].
   */
  async verifyDocument(documentId: string, status: DocumentVerificationStatus, auditUserId: string) {
    return prisma.$transaction(async (tx) => {
      const document = await tx.studentDocument.update({
        where: { id: documentId },
        data: { verificationStatus: status }
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: `VERIFY_DOC_${status}`, entityType: 'DOCUMENT', entityId: documentId }
      });

      return document;
    });
  }
}