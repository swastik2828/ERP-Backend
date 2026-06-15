import { z } from 'zod';

export const bulkCreateSchema = z.object({
  body: z.object({
    academicSessionId: z.string().uuid('Invalid Academic Session ID'),
    classes: z.array(
      z.object({
        name: z.string().min(2).max(50),
        code: z.string().min(1).max(20),
        displayOrder: z.number().int().min(1),
        description: z.string().optional(),
        sections: z.array(
          z.object({
            name: z.string().min(1).max(20),
            capacity: z.number().int().min(1).default(40),
            roomNumber: z.string().optional(),
          })
        ).min(1, 'At least one section is required per class'),
      })
    ).min(1, 'At least one class is required'),
  }),
});

export type BulkCreateDto = z.infer<typeof bulkCreateSchema>['body'];