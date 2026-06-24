import { z } from 'zod';
import { ExamType } from '@prisma/client';

// Helper for UUIDs
const uuidSchema = z.string().uuid();

export const CreateExamSchema = z.object({
  body: z.object({
    academicSessionId: uuidSchema,
    name: z.string().min(3).max(255),
    examType: z.nativeEnum(ExamType),
    description: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be after or equal to start date",
    path: ["endDate"]
  })
});

export const AddExamSubjectSchema = z.object({
  body: z.object({
    subjectId: uuidSchema,
    classId: uuidSchema,
    sectionId: uuidSchema.optional(),
    maxMarks: z.number().positive("Max marks cannot be zero or negative"), // [cite: 448]
    passMarks: z.number().min(0),
    weightage: z.number().min(0).max(100) // [cite: 113, 348]
  }).refine((data) => data.passMarks <= data.maxMarks, {
    message: "Pass marks cannot exceed maximum marks", // [cite: 112, 346]
    path: ["passMarks"]
  })
});

export const CreateExamScheduleSchema = z.object({
  body: z.object({
    examSubjectId: uuidSchema,
    examDate: z.string().datetime(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    room: z.string().max(50).optional(),
    invigilatorId: uuidSchema.optional()
  }).refine((data) => {
    const start = new Date(`1970-01-01T${data.startTime}:00`);
    const end = new Date(`1970-01-01T${data.endTime}:00`);
    return end > start;
  }, {
    message: "End time must be after start time", // [cite: 128, 354]
    path: ["endTime"]
  })
});

// Infer TypeScript types from Zod schemas for Service layers
export type CreateExamDto = z.infer<typeof CreateExamSchema>['body'];
export type AddExamSubjectDto = z.infer<typeof AddExamSubjectSchema>['body'];
export type CreateExamScheduleDto = z.infer<typeof CreateExamScheduleSchema>['body'];