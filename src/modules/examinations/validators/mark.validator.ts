import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const MarkEntrySchema = z.object({
  studentId: uuidSchema,
  examSubjectId: uuidSchema,
  marksObtained: z.number().min(0, "Marks cannot be negative"),
  remarks: z.string().max(500).optional()
});

export const BulkMarkEntrySchema = z.object({
  body: z.object({
    marks: z.array(MarkEntrySchema).min(1, "Must provide at least one mark entry")
  })
});

export const VerifyMarksSchema = z.object({
  body: z.object({
    examSubjectId: uuidSchema,
    studentIds: z.array(uuidSchema).min(1, "Must provide at least one student ID to verify")
  })
});

export type MarkEntryDto = z.infer<typeof MarkEntrySchema>;
export type BulkMarkEntryDto = z.infer<typeof BulkMarkEntrySchema>['body'];
export type VerifyMarksDto = z.infer<typeof VerifyMarksSchema>['body'];