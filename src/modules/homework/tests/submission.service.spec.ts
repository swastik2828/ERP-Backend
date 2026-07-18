import { SubmissionService } from '../services/submission.service';
import { SubmissionRepository } from '../repositories/submission.repository';
import { AssignmentRepository } from '../repositories/assignment.repository';
import { HOMEWORK_ERROR_CODES } from '../constants/error-codes.constants';

jest.mock('../repositories/submission.repository');
jest.mock('../repositories/assignment.repository');

describe('SubmissionService', () => {
  let submissionService: SubmissionService;
  let mockSubmissionRepo: jest.Mocked<SubmissionRepository>;
  let mockAssignmentRepo: jest.Mocked<AssignmentRepository>;

  const mockSchoolId = 'school-uuid';
  const mockTeacherId = 'teacher-uuid';
  const mockSubmissionId = 'submission-uuid';
  const mockAssignmentId = 'assignment-uuid';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmissionRepo = new SubmissionRepository() as jest.Mocked<SubmissionRepository>;
    mockAssignmentRepo = new AssignmentRepository() as jest.Mocked<AssignmentRepository>;
    submissionService = new SubmissionService(mockSubmissionRepo, mockAssignmentRepo);
  });

  describe('gradeSubmission', () => {
    it('should successfully grade a submission and return it to the student', async () => {
      mockSubmissionRepo.findById.mockResolvedValue({
        id: mockSubmissionId,
        assignmentId: mockAssignmentId,
        studentId: 'student-uuid',
        isLate: false,
        attemptNumber: 1,
        submissionGroupId: 'group-uuid',
      } as any);

      mockAssignmentRepo.findByIdAndSchool.mockResolvedValue({
        id: mockAssignmentId,
        maxScore: 100,
        lateSubmissionPenaltyPercent: 0,
      } as any);

      mockSubmissionRepo.upsertDraft.mockResolvedValue({ status: 'RETURNED', finalScore: 85 } as any);

      const result = await submissionService.gradeSubmission(
        mockSubmissionId,
        mockSchoolId,
        mockTeacherId,
        { score: 85, returnToStudent: true }
      );

      expect(result.status).toBe('RETURNED');
      expect(result.finalScore).toBe(85);
      expect(mockSubmissionRepo.upsertDraft).toHaveBeenCalledWith(
        mockAssignmentId,
        'student-uuid',
        mockSchoolId,
        expect.objectContaining({ score: 85, finalScore: 85, status: 'RETURNED' })
      );
    });

    it('should throw an error if the score exceeds the maximum allowed score', async () => {
      mockSubmissionRepo.findById.mockResolvedValue({
        id: mockSubmissionId,
        assignmentId: mockAssignmentId,
      } as any);

      mockAssignmentRepo.findByIdAndSchool.mockResolvedValue({
        id: mockAssignmentId,
        maxScore: 50, // Max score is 50
      } as any);

      await expect(
        submissionService.gradeSubmission(mockSubmissionId, mockSchoolId, mockTeacherId, { score: 75, returnToStudent: true })
      ).rejects.toThrow(HOMEWORK_ERROR_CODES.SCORE_OUT_OF_RANGE);
    });

    it('should calculate and apply the late penalty correctly', async () => {
      mockSubmissionRepo.findById.mockResolvedValue({
        id: mockSubmissionId,
        assignmentId: mockAssignmentId,
        studentId: 'student-uuid',
        isLate: true, // Submission is late
        attemptNumber: 1,
        submissionGroupId: 'group-uuid',
      } as any);

      mockAssignmentRepo.findByIdAndSchool.mockResolvedValue({
        id: mockAssignmentId,
        maxScore: 100,
        lateSubmissionPenaltyPercent: 10, // 10% penalty
      } as any);

      mockSubmissionRepo.upsertDraft.mockResolvedValue({ status: 'GRADED', finalScore: 81 } as any);

      await submissionService.gradeSubmission(mockSubmissionId, mockSchoolId, mockTeacherId, { score: 90, returnToStudent: false });

      // 90 score - 10% penalty (9 points) = 81 final score
      expect(mockSubmissionRepo.upsertDraft).toHaveBeenCalledWith(
        mockAssignmentId,
        'student-uuid',
        mockSchoolId,
        expect.objectContaining({ score: 90, finalScore: 81, status: 'GRADED' })
      );
    });
  });
});