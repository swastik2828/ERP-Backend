import { z } from 'zod';
import { admissionSchema } from '../validators/admission.validator';

// Automatically infer the TypeScript types from your strict Zod validator
export type AdmissionDto = z.infer<typeof admissionSchema>['body'];