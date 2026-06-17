import { z } from 'zod';
import { SubjectType, SubjectCategory, SubjectStatus } from '@prisma/client';

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Subject name must be at least 2 characters').max(255),
    code: z.string().min(1, 'Subject code is required').max(50),
    shortName: z.string().max(50).optional(),
    description: z.string().optional(),
    subjectType: z.nativeEnum(SubjectType),
    category: z.nativeEnum(SubjectCategory),
    credits: z.number().int('Credits must be an integer').min(0, 'Credits cannot be negative').optional(),
    displayOrder: z.number().int().min(0, 'Display order cannot be negative'),
  }),
});

export const updateSubjectSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid Subject ID') }),
  body: z.object({
    name: z.string().min(2).max(255).optional(),
    description: z.string().optional(),
    credits: z.number().int().min(0).optional().nullable(),
    displayOrder: z.number().int().min(0).optional(),
    status: z.nativeEnum(SubjectStatus).optional(),
    // Note: schoolId, createdBy, createdAt, and code are intentionally omitted here as they are non-editable
  }),
});

export const updateSubjectStatusSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid Subject ID') }),
  body: z.object({
    status: z.enum([SubjectStatus.ACTIVE, SubjectStatus.INACTIVE, SubjectStatus.ARCHIVED]),
  }),
});

export const querySubjectSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10),
    subjectType: z.nativeEnum(SubjectType).optional(),
    category: z.nativeEnum(SubjectCategory).optional(),
    status: z.nativeEnum(SubjectStatus).optional(),
    academicSessionId: z.string().uuid().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['name', 'code', 'displayOrder', 'createdAt', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

export const createCurriculumMappingSchema = z.object({
  body: z.object({
    academicSessionId: z.string().uuid('Invalid Academic Session ID'),
    classId: z.string().uuid('Invalid Class ID'),
    subjectId: z.string().uuid('Invalid Subject ID'),
    isMandatory: z.boolean().default(true),
  }),
});