import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, "Code must be lowercase alphanumeric with hyphens/underscores"),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  displayOrder: z.number().int().min(0).default(0),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;