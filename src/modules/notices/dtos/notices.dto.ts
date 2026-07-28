import { z } from 'zod';
import { NoticeType, NoticePriority, NoticeStatus, TargetType, Role } from '@prisma/client';

export const CreateNoticeSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(255),
    content: z.string().min(10, "Content must be at least 10 characters").max(50000),
    summary: z.string().max(500).optional(),
    type: z.nativeEnum(NoticeType).default(NoticeType.NOTICE),
    priority: z.nativeEnum(NoticePriority).default(NoticePriority.NORMAL),
    categoryId: z.string().uuid().optional(),
    academicSessionId: z.string().uuid().optional(),
    publishAt: z.string().datetime().optional().refine(
      (date) => !date || new Date(date) > new Date(),
      { message: "Publish date must be in the future" }
    ),
    expiresAt: z.string().datetime().optional().refine(
      (date) => !date || new Date(date) > new Date(),
      { message: "Expiry date must be in the future" }
    ),
    requiresAcknowledgment: z.boolean().default(false),
    acknowledgmentDeadline: z.string().datetime().optional(),
    allowComments: z.boolean().default(true),
    targets: z.array(z.object({
      targetType: z.nativeEnum(TargetType),
      targetRole: z.nativeEnum(Role).optional(),
      targetClassId: z.string().uuid().optional(),
      targetSectionId: z.string().uuid().optional(),
      targetStudentId: z.string().uuid().optional(),
      targetParentId: z.string().uuid().optional(),
      targetTeacherId: z.string().uuid().optional(),
      targetUserId: z.string().uuid().optional(),
    })).min(1, "At least one target audience is required"),
  })
});

export type CreateNoticeDto = z.infer<typeof CreateNoticeSchema>['body'];

export const UpdateNoticeSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(255).optional(),
    content: z.string().min(10).max(50000).optional(),
    summary: z.string().max(500).optional(),
    priority: z.nativeEnum(NoticePriority).optional(),
    categoryId: z.string().uuid().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    allowComments: z.boolean().optional(),
    targets: z.array(z.object({
      targetType: z.nativeEnum(TargetType),
      targetRole: z.nativeEnum(Role).optional(),
      targetClassId: z.string().uuid().optional(),
      targetSectionId: z.string().uuid().optional(),
      targetStudentId: z.string().uuid().optional(),
      targetParentId: z.string().uuid().optional(),
      targetTeacherId: z.string().uuid().optional(),
      targetUserId: z.string().uuid().optional(),
    })).optional(),
  })
});

export type UpdateNoticeDto = z.infer<typeof UpdateNoticeSchema>['body'];

export const AcknowledgeNoticeSchema = z.object({
  body: z.object({
    remarks: z.string().max(1000).optional(),
    signatureUrl: z.string().url().max(500).optional(),
  })
});

export type AcknowledgeNoticeDto = z.infer<typeof AcknowledgeNoticeSchema>['body'];

export const CreateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, "Code must be lowercase alphanumeric with hyphens/underscores"),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().max(50).optional(),
    displayOrder: z.number().int().min(0).default(0),
  })
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>['body'];

export const ListNoticesQuerySchema = z.object({
  query: z.object({
    type: z.nativeEnum(NoticeType).optional(),
    status: z.nativeEnum(NoticeStatus).optional(),
    priority: z.nativeEnum(NoticePriority).optional(),
    categoryId: z.string().uuid().optional(),
    search: z.string().max(100).optional(),
    isPinned: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    page: z.string().optional().default("1").transform(Number).pipe(z.number().min(1)),
    pageSize: z.string().optional().default("20").transform(Number).pipe(z.number().min(1).max(100)),
    sortBy: z.enum(["createdAt", "updatedAt", "publishedAt", "priority"]).optional().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
});