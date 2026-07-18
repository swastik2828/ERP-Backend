import { z } from 'zod';
import { SubmissionType } from '@prisma/client';

export const CreateAssignmentSchema = z.object({
  academicSessionId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  clarificationNote: z.string().optional(),
  submissionType: z.nativeEnum(SubmissionType).default(SubmissionType.TEXT_AND_FILE),
  maxScore: z.number().min(0).max(1000).default(100),
  dueDate: z.string().datetime().refine((date) => new Date(date) > new Date(), {
    message: "Due date must be in the future",
  }),
  publishAt: z.string().datetime().optional(),
  gracePeriodHours: z.number().int().min(0).max(168).default(0), // Max 1 week
  allowLateSubmission: z.boolean().default(true),
  lateSubmissionPenaltyPercent: z.number().min(0).max(100).default(0),
  allowResubmission: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).max(10).default(1),
  allowStudentComments: z.boolean().default(true),
  instructionsAttachmentRequired: z.boolean().default(false),
});

export type CreateAssignmentDto = z.infer<typeof CreateAssignmentSchema>;

export const GradeSubmissionSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().optional(),
  returnToStudent: z.boolean().default(true),
});

export type GradeSubmissionDto = z.infer<typeof GradeSubmissionSchema>;