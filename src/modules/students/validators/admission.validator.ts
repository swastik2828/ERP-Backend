import { z } from 'zod';
import { Gender, BloodGroup } from '@prisma/client';

export const admissionSchema = z.object({
  body: z.object({
    student: z.object({
      enrollmentNumber: z.string().min(1, 'Enrollment number is required'),
      firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
      lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
      dateOfBirth: z.coerce.date({ message: "A valid date of birth is required" }),
      gender: z.nativeEnum(Gender, { message: 'Invalid gender' }),
      bloodGroup: z.nativeEnum(BloodGroup, { message: 'Invalid blood group' }).optional(),
      medicalBrief: z.string().optional(),
      
      classId: z.string().uuid('Invalid Class ID'), // Enforces UUID format
      
      fatherName: z.string().min(2, 'Father name is required').max(100),
      motherName: z.string().min(2, 'Mother name is required').max(100),
      aadharNumber: z.string()
        .length(12, 'Aadhaar must be exactly 12 digits')
        .regex(/^\d+$/, 'Aadhaar must contain only numbers')
        .optional(),
    }),
    
    parent: z.object({
      existingParentId: z.string().uuid().optional(), // Use if a sibling is already in the school
      firstName: z.string().min(2).max(100).optional(),
      lastName: z.string().min(2).max(100).optional(),
      email: z.string().email('Invalid email').toLowerCase().trim().optional(),
      primaryPhone: z.string().min(10).max(20).optional(),
      alternatePhone: z.string().max(20).optional().nullable(),
      occupation: z.string().max(100).optional(),
    }).refine((data) => {
      // Must either provide an existing parent ID, or full details to create a new one
      return data.existingParentId || (data.firstName && data.lastName && data.email && data.primaryPhone);
    }, { message: "Provide either an existingParentId or complete new parent details (firstName, lastName, email, primaryPhone)" }),

    address: z.object({
      addressLine1: z.string().min(5).max(255),
      addressLine2: z.string().max(255).optional(),
      city: z.string().min(2).max(100),
      state: z.string().min(2).max(100),
      zipCode: z.string().min(4).max(20),
      country: z.string().default('India').optional(),
    }).optional(),
  })
});

export type AdmissionDto = z.infer<typeof admissionSchema>['body'];