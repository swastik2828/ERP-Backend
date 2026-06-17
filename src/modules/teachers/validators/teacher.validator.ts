import { z } from 'zod';
import { Gender, BloodGroup, MaritalStatus, EmploymentType, TeacherStatus } from '@prisma/client';

// Shared address schema
const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  zipCode: z.string().min(1, 'Zip code is required').max(20),
  country: z.string().default('India').optional(),
});

export const createTeacherSchema = z.object({
  body: z.object({
    // Personal Info
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    dateOfBirth: z.string().datetime().optional(), // Expecting ISO-8601
    gender: z.nativeEnum(Gender),
    email: z.string().email('Invalid email address'),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    alternatePhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().nullable(),
    bloodGroup: z.nativeEnum(BloodGroup).optional().nullable(),
    maritalStatus: z.nativeEnum(MaritalStatus).optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),

    // Professional Info
    employeeId: z.string().min(1, 'Employee ID is required').max(50),
    department: z.string().max(100).optional().nullable(),
    designation: z.string().max(100).optional().nullable(),
    qualification: z.string().max(255).optional().nullable(),
    experienceYears: z.number().int().min(0).optional().nullable(),
    joiningDate: z.string().datetime().optional(), // Expecting ISO-8601
    employmentType: z.nativeEnum(EmploymentType),

    // Address Info
    address: addressSchema.optional(),
  }),
});

export const updateTeacherSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
    alternatePhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().nullable(),
    email: z.string().email('Invalid email address').optional(),
    qualification: z.string().max(255).optional().nullable(),
    experienceYears: z.number().int().min(0).optional().nullable(),
    designation: z.string().max(100).optional().nullable(),
    department: z.string().max(100).optional().nullable(),
    address: addressSchema.partial().optional(),
    photoUrl: z.string().url().optional().nullable(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid teacher ID'),
  }),
});

export const updateTeacherStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(TeacherStatus),
  }),
  params: z.object({
    id: z.string().uuid('Invalid teacher ID'),
  }),
});

export const assignClassTeacherSchema = z.object({
  body: z.object({
    classId: z.string().uuid('Invalid class ID'),
    sectionId: z.string().uuid('Invalid section ID').optional().nullable(),
    assignmentType: z.enum(['PRIMARY', 'ASSISTANT']).default('PRIMARY'),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional().nullable(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid teacher ID'),
  }),
});

export const getTeachersQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default(1),
    limit: z.string().regex(/^\d+$/).transform(Number).default(10),
    department: z.string().optional(),
    designation: z.string().optional(),
    status: z.nativeEnum(TeacherStatus).optional(),
    employmentType: z.nativeEnum(EmploymentType).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'joiningDate', 'employeeId', 'firstName']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export type CreateTeacherDto = z.infer<typeof createTeacherSchema>['body'];
export type UpdateTeacherDto = z.infer<typeof updateTeacherSchema>['body'];
export type AssignClassTeacherDto = z.infer<typeof assignClassTeacherSchema>['body'];