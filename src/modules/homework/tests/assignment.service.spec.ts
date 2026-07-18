import { AssignmentService } from '../services/assignment.service';
import { AssignmentRepository } from '../repositories/assignment.repository';
import { AssignmentStatus, SubmissionType } from '@prisma/client';
import { HOMEWORK_ERROR_CODES } from '../constants/error-codes.constants';

// Mock the entire repository layer
jest.mock('../repositories/assignment.repository');

describe('AssignmentService', () => {
  let assignmentService: AssignmentService;
  let mockRepo: jest.Mocked<AssignmentRepository>;

  const mockSchoolId = 'school-uuid-123';
  const mockTeacherId = 'teacher-uuid-456';
  const mockAssignmentId = 'assignment-uuid-789';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    mockRepo = new AssignmentRepository() as jest.Mocked<AssignmentRepository>;
    assignmentService = new AssignmentService(mockRepo);
  });

  describe('createAssignment', () => {
    it('should create an assignment with DRAFT status if no publishAt date is provided', async () => {
      const dto = {
        title: 'Math Homework',
        description: 'Complete page 42',
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        academicSessionId: 'session-id',
        classId: 'class-id',
        sectionId: 'section-id',
        subjectId: 'subject-id',
        submissionType: SubmissionType.TEXT_AND_FILE,
        maxScore: 100,
        gracePeriodHours: 0,
        allowLateSubmission: true,
        lateSubmissionPenaltyPercent: 0,
        allowResubmission: true,
        maxAttempts: 1,
        allowStudentComments: true,
        instructionsAttachmentRequired: false,
      };

      mockRepo.create.mockResolvedValue({ id: mockAssignmentId, status: AssignmentStatus.DRAFT } as any);

      const result = await assignmentService.createAssignment(mockSchoolId, mockTeacherId, dto);

      expect(result.status).toBe(AssignmentStatus.DRAFT);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AssignmentStatus.DRAFT,
          schoolId: mockSchoolId,
        })
      );
    });

    it('should throw an error if publishAt is after the dueDate', async () => {
      const dto = {
        title: 'Science Project',
        description: 'Build a volcano',
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        publishAt: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        // ... omitted other required fields for brevity
      } as any;

      await expect(
        assignmentService.createAssignment(mockSchoolId, mockTeacherId, dto)
      ).rejects.toThrow(HOMEWORK_ERROR_CODES.DUE_DATE_BEFORE_PUBLISH);
    });
  });

  describe('publishAssignment', () => {
    it('should successfully publish a DRAFT assignment', async () => {
      mockRepo.findByIdAndSchool.mockResolvedValue({
        id: mockAssignmentId,
        status: AssignmentStatus.DRAFT,
      } as any);

      mockRepo.update.mockResolvedValue({
        id: mockAssignmentId,
        status: AssignmentStatus.PUBLISHED,
      } as any);

      const result = await assignmentService.publishAssignment(mockAssignmentId, mockSchoolId, mockTeacherId);

      expect(result.status).toBe(AssignmentStatus.PUBLISHED);
      expect(mockRepo.update).toHaveBeenCalledWith(
        mockAssignmentId,
        mockSchoolId,
        expect.objectContaining({ status: AssignmentStatus.PUBLISHED })
      );
    });

    it('should throw an error if trying to publish an assignment that is already ACTIVE', async () => {
      mockRepo.findByIdAndSchool.mockResolvedValue({
        id: mockAssignmentId,
        status: AssignmentStatus.ACTIVE, // Invalid starting state
      } as any);

      await expect(
        assignmentService.publishAssignment(mockAssignmentId, mockSchoolId, mockTeacherId)
      ).rejects.toThrow(HOMEWORK_ERROR_CODES.INVALID_STATE_TRANSITION);
    });
  });
});