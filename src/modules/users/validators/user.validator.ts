import { z } from 'zod';
import { Role, AccountStatus } from '@prisma/client';

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(255),
    email: z.string().email('Invalid email format').toLowerCase().trim(),
    phone: z.string().max(20).optional().nullable(),
    // FIXED: Zod 4.4.3 expects specifically { message: string } or { error: string }
    role: z.nativeEnum(Role, { 
      message: 'Invalid role provided' 
    }),
    schoolId: z.string().uuid('Invalid School ID format').optional(),
    
    newSchool: z.object({
      name: z.string().min(3, 'School name is required'),
      code: z.string().min(2, 'School code is required'),
    }).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(255).optional(),
    phone: z.string().max(20).optional().nullable(),
    accountStatus: z.nativeEnum(AccountStatus).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid User ID'),
  }),
});

export const queryUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10),
    role: z.nativeEnum(Role).optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  }),
});