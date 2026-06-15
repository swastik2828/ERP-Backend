import { z } from 'zod';
import { EntityStatus } from '@prisma/client';

export const createSectionSchema = z.object({
  body: z.object({
    classId: z.string().uuid('Invalid Class ID'),
    name: z.string().min(1, 'Section name is required').max(20),
    capacity: z.number().int().min(1, 'Capacity must be at least 1').default(40),
    roomNumber: z.string().max(50).optional(),
  }),
});

export const updateSectionSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid Section ID') }),
  body: z.object({
    name: z.string().min(1).max(20).optional(),
    capacity: z.number().int().min(1).optional(),
    roomNumber: z.string().max(50).optional(),
    status: z.nativeEnum(EntityStatus).optional(),
  }),
});

export const querySectionSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10),
    classId: z.string().uuid().optional(),
    search: z.string().optional(),
    status: z.nativeEnum(EntityStatus).optional(),
  }),
});