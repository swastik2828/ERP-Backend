import { AssignmentSubmission } from '@prisma/client';
import { SubmissionRepository } from '../repositories/submission.repository';
import { AssignmentRepository } from '../repositories/assignment.repository';
import { HOMEWORK_ERROR_CODES } from '../constants/error-codes.constants';
import { GradeSubmissionDto } from '../dtos/assignment.dto';

export class SubmissionService {
  constructor(
    private readonly submissionRepo: SubmissionRepository,
    private readonly assignmentRepo: AssignmentRepository
  ) {}

  /**
   * Grades a student's submission.
   */
  async gradeSubmission(
    submissionId: string,
    schoolId: string,
    teacherId: string,
    data: GradeSubmissionDto
  ): Promise<AssignmentSubmission> {
    const submission = await this.submissionRepo.findById(submissionId, schoolId);
    if (!submission) {
      throw new Error(HOMEWORK_ERROR_CODES.FORBIDDEN);
    }

    const assignment = await this.assignmentRepo.findByIdAndSchool(submission.assignmentId, schoolId);
    
    // BR-025: Score cannot exceed max score
    if (data.score > Number(assignment?.maxScore)) {
      throw new Error(HOMEWORK_ERROR_CODES.SCORE_OUT_OF_RANGE);
    }

    // Calculate final score if late penalty applies
    let finalScore = data.score;
    if (submission.isLate && assignment?.lateSubmissionPenaltyPercent) {
      const penalty = (data.score * Number(assignment.lateSubmissionPenaltyPercent)) / 100;
      finalScore = data.score - penalty;
    }

    // Determine new status based on whether it is being returned to the student
    const newStatus = data.returnToStudent ? 'RETURNED' : 'GRADED';

   return this.submissionRepo.upsertDraft(
        submission.assignmentId,
        submission.studentId,
        schoolId,
        {
          submissionGroupId: submission.submissionGroupId, // Fix: Added missing property
          attemptNumber: submission.attemptNumber,
          score: data.score,
          finalScore: finalScore,
          status: newStatus,
          gradedBy: teacherId,
          gradedAt: new Date(),
          returnedAt: data.returnToStudent ? new Date() : null,
        }
    );
  }
}