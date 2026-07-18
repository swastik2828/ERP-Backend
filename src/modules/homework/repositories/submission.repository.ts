import {  AssignmentSubmission, Prisma } from '@prisma/client';
import prisma from '../../../database/prisma';

export class SubmissionRepository {
  async upsertDraft(
    assignmentId: string, 
    studentId: string, 
    schoolId: string, 
    data: Omit<Prisma.AssignmentSubmissionUncheckedCreateInput, 'assignmentId' | 'studentId' | 'schoolId'>
  ): Promise<AssignmentSubmission> {
    // Upserting based on the unique index [assignmentId, studentId, attemptNumber]
    return prisma.assignmentSubmission.upsert({
      where: {
        idx_submission_assignment_student: {
          assignmentId,
          studentId,
          attemptNumber: data.attemptNumber || 1
        }
      },
      create: {
        ...data,
        assignmentId,
        studentId,
        schoolId,
        status: 'DRAFT'
      },
      update: {
        textResponse: data.textResponse,
        updatedAt: new Date(),
      }
    });
  }

  async findByIdempotencyKey(schoolId: string, idempotencyKey: string): Promise<AssignmentSubmission | null> {
    return prisma.assignmentSubmission.findUnique({
      where: {
        idx_submission_idempotency: {
          schoolId,
          idempotencyKey,
        }
      }
    });
  }
  
  async findById(id: string, schoolId: string): Promise<AssignmentSubmission | null> {
    return prisma.assignmentSubmission.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null
      }
    });
  }
}