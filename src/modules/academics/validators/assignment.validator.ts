import { z } from 'zod';
import { AssignmentType } from '@prisma/client';

export const createAssignmentSchema = z.object({
  body: z.object({
    classId: z.string().uuid('Invalid Class ID'),
    sectionId: z.string().uuid('Invalid Section ID').optional(),
    teacherId: z.string().uuid('Invalid Teacher ID'),
    assignmentType: z.nativeEnum(AssignmentType).default('PRIMARY'),
    startDate: z.coerce.date({ message: "A valid start date is required" }),
    endDate: z.coerce.date().optional(),
  }),
});

export const updateAssignmentSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid Assignment ID') }),
  body: z.object({
    assignmentType: z.nativeEnum(AssignmentType).optional(),
    endDate: z.coerce.date().optional(),
  }),
});