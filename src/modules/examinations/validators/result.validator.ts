import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const GenerateResultsSchema = z.object({
  body: z.object({
    examId: uuidSchema,
    classId: uuidSchema
  })
});

export const ReportCardQuerySchema = z.object({
  params: z.object({
    studentId: uuidSchema
  }),
  query: z.object({
    examId: uuidSchema
  })
});

export type GenerateResultsDto = z.infer<typeof GenerateResultsSchema>['body'];