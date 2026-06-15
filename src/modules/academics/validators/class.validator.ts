import { z } from 'zod';
import { EntityStatus } from '@prisma/client';

export const createClassSchema = z.object({
  body: z.object({
    academicSessionId: z.string().uuid('Invalid Academic Session ID'),
    name: z.string().min(2, 'Class name is required').max(50),
    code: z.string().min(1, 'Code is required').max(20),
    displayOrder: z.number().int('Display order must be an integer').min(1),
    description: z.string().max(500).optional(),
  }),
});

export const updateClassSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid Class ID') }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    code: z.string().min(1).max(20).optional(),
    displayOrder: z.number().int().min(1).optional(),
    description: z.string().max(500).optional(),
    status: z.nativeEnum(EntityStatus).optional(),
  }),
});

export const queryClassSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10),
    academicSessionId: z.string().uuid().optional(),
    search: z.string().optional(),
    status: z.nativeEnum(EntityStatus).optional(),
  }),
});