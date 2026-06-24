import prisma from '../../../database/prisma';
import { MarkEntryDto } from '../validators/mark.validator';
import { AppError } from '../../../errors/AppError';

export class MarkService {
  /**
   * Bulk marks entry with transaction rollback on failure (PRD Requirement)
   */
  async bulkEnterMarks(data: MarkEntryDto[], schoolId: string, userId: string, ipAddress?: string) {
    if (!data.length) return { count: 0 };

    // 1. Validate Exam & Subject State
    const examSubjectId = data[0].examSubjectId; // Assuming bulk entry is per subject
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: examSubjectId },
      include: { exam: true }
    });

    if (!examSubject || examSubject.exam.schoolId !== schoolId) {
      throw new AppError('Exam subject not found or access denied.', 404);
    }
    if (examSubject.exam.isLocked) {
      throw new AppError('Cannot enter marks: Examination is locked.', 403);
    }

    // 2. Validate PRD Rules (marks <= maxMarks, marks >= 0 already handled by Zod)
    for (const entry of data) {
      if (entry.examSubjectId !== examSubjectId) {
        throw new AppError('Bulk entry must be for a single exam subject.', 400);
      }
      if (entry.marksObtained > examSubject.maxMarks) {
        throw new AppError(`Marks for student ${entry.studentId} exceed the maximum allowed (${examSubject.maxMarks}).`, 400);
      }
    }

    // 3. Execute Upsert & Audit Log inside a single Transaction
    const result = await prisma.$transaction(async (tx) => {
      let count = 0;
      
      for (const entry of data) {
        // Upsert allows updating if it already exists, or creating if it doesn't
        const mark = await tx.studentMark.upsert({
          where: {
            studentId_examSubjectId: {
              studentId: entry.studentId,
              examSubjectId: entry.examSubjectId
            }
          },
          update: {
            marksObtained: entry.marksObtained,
            remarks: entry.remarks,
            enteredBy: userId,
            // If modified after verification, PRD says it requires approval. 
            // Here we invalidate previous verification so it must be re-verified.
            verifiedBy: null, 
            verifiedAt: null
          },
          create: {
            schoolId,
            examId: examSubject.examId,
            examSubjectId: entry.examSubjectId,
            studentId: entry.studentId,
            marksObtained: entry.marksObtained,
            remarks: entry.remarks,
            enteredBy: userId
          }
        });

        count++;

        // Audit Log for every mark modification
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'MARK_ENTERED',
            entityType: 'STUDENT_MARK',
            entityId: mark.id,
            ipAddress: ipAddress || null,
          }
        });
      }

      return { count };
    });

    return result;
  }

  /**
   * Verifies marks locking them from standard modification
   */
  async verifyMarks(examSubjectId: string, studentIds: string[], schoolId: string, userId: string, ipAddress?: string) {
    const result = await prisma.$transaction(async (tx) => {
      const { count } = await tx.studentMark.updateMany({
        where: {
          examSubjectId,
          schoolId,
          studentId: { in: studentIds },
          verifiedAt: null // Only update unverified marks
        },
        data: {
          verifiedBy: userId,
          verifiedAt: new Date()
        }
      });

      // Audit Log for Verification
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'MARK_VERIFIED',
          entityType: 'EXAM_SUBJECT',
          entityId: examSubjectId,
          ipAddress: ipAddress || null,
        }
      });

      return { verifiedCount: count };
    });

    return result;
  }
}