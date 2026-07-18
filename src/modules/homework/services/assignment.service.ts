import { Assignment, AssignmentStatus } from '@prisma/client';
import { AssignmentRepository } from '../repositories/assignment.repository';
import { CreateAssignmentDto } from '../dtos/assignment.dto';
import { HOMEWORK_ERROR_CODES } from '../constants/error-codes.constants';

export class AssignmentService {
  constructor(private readonly assignmentRepo: AssignmentRepository) {}

  /**
   * Creates a new assignment as DRAFT or SCHEDULED based on publishAt date.
   */
  async createAssignment(
    schoolId: string,
    teacherId: string,
    data: CreateAssignmentDto
  ): Promise<Assignment> {
    
    // BR-011: Check if publishAt is provided and logical
   let initialStatus: AssignmentStatus = AssignmentStatus.DRAFT; 
if (data.publishAt) {
  if (new Date(data.publishAt) >= new Date(data.dueDate)) {
    throw new Error(HOMEWORK_ERROR_CODES.DUE_DATE_BEFORE_PUBLISH);
  }
  initialStatus = AssignmentStatus.SCHEDULED;
}

    return this.assignmentRepo.create({
      schoolId,
      teacherId,
      createdBy: teacherId,
      status: initialStatus,
      ...data,
      dueDate: new Date(data.dueDate),
      publishAt: data.publishAt ? new Date(data.publishAt) : null,
    });
  }

  /**
   * Publishes a draft or scheduled assignment immediately.
   */
  async publishAssignment(id: string, schoolId: string, teacherId: string): Promise<Assignment> {
    // 1. Fetch the assignment first (This was missing in your compiler's context)
    const assignment = await this.assignmentRepo.findByIdAndSchool(id, schoolId);

    if (!assignment) {
      throw new Error(HOMEWORK_ERROR_CODES.FORBIDDEN);
    }

    // 2. Safely check the status using typed arrays
    const allowedStatuses: AssignmentStatus[] = [AssignmentStatus.DRAFT, AssignmentStatus.SCHEDULED];
    if (!allowedStatuses.includes(assignment.status)) {
      throw new Error(HOMEWORK_ERROR_CODES.INVALID_STATE_TRANSITION);
    }

    // 3. Update and return
    return this.assignmentRepo.update(id, schoolId, {
      status: AssignmentStatus.PUBLISHED,
      publishedAt: new Date(),
      updatedBy: teacherId,
    });
  }

  /**
   * Soft deletes an assignment, strictly isolating by tenant.
   */
  async deleteAssignment(id: string, schoolId: string, userId: string): Promise<void> {
    const assignment = await this.assignmentRepo.findByIdAndSchool(id, schoolId);
    
    if (!assignment) {
      throw new Error(HOMEWORK_ERROR_CODES.FORBIDDEN);
    }

    // In a full implementation, wrap this in a Prisma Transaction to soft-delete 
    // child records (submissions, attachments) simultaneously.
    await this.assignmentRepo.softDelete(id, schoolId, userId);
  }
}