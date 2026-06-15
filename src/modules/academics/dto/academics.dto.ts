import { z } from 'zod';
import { createClassSchema, updateClassSchema, queryClassSchema } from '../validators/class.validator';
import { createSectionSchema, updateSectionSchema, querySectionSchema } from '../validators/section.validator';
import { createAssignmentSchema, updateAssignmentSchema } from '../validators/assignment.validator';

export type CreateClassDto = z.infer<typeof createClassSchema>['body'];
export type UpdateClassDto = z.infer<typeof updateClassSchema>['body'];
export type QueryClassDto = z.infer<typeof queryClassSchema>['query'];

export type CreateSectionDto = z.infer<typeof createSectionSchema>['body'];
export type UpdateSectionDto = z.infer<typeof updateSectionSchema>['body'];
export type QuerySectionDto = z.infer<typeof querySectionSchema>['query'];

export type CreateAssignmentDto = z.infer<typeof createAssignmentSchema>['body'];
export type UpdateAssignmentDto = z.infer<typeof updateAssignmentSchema>['body'];