import { z } from 'zod';
import { DayOfWeek, RoomType, PeriodType } from '@prisma/client';

// ============================================================================
// PERIOD VALIDATORS
// ============================================================================

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

// 1. Extract the base object BEFORE refinement
const periodBodyBase = z.object({
  name: z.string().min(2).max(50),
  type: z.nativeEnum(PeriodType).default(PeriodType.LECTURE),
  startTime: z.string().regex(timeRegex, "Invalid start time format. Use HH:mm"),
  endTime: z.string().regex(timeRegex, "Invalid end time format. Use HH:mm"),
  displayOrder: z.number().int().min(1),
});

// 2. Apply refinement to the create schema
export const createPeriodSchema = z.object({
  body: periodBodyBase.refine((data) => {
    const [startHr, startMin] = data.startTime.split(':').map(Number);
    const [endHr, endMin] = data.endTime.split(':').map(Number);
    return (endHr * 60 + endMin) > (startHr * 60 + startMin);
  }, {
    message: "End time must be after start time",
    path: ["endTime"]
  })
});

// 3. Apply partial FIRST, then refine only if both fields are provided during an update
export const updatePeriodSchema = z.object({
  body: periodBodyBase.partial().refine((data) => {
    if (data.startTime && data.endTime) {
      const [startHr, startMin] = data.startTime.split(':').map(Number);
      const [endHr, endMin] = data.endTime.split(':').map(Number);
      return (endHr * 60 + endMin) > (startHr * 60 + startMin);
    }
    return true; // Pass if they are only updating one field
  }, {
    message: "End time must be after start time",
    path: ["endTime"]
  }),
  params: z.object({
    id: z.string().uuid("Invalid Period ID")
  })
});

// ============================================================================
// CLASSROOM VALIDATORS (Leave the rest of the file exactly as it was)
// ============================================================================

export const createClassroomSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    building: z.string().max(100).optional(),
    floor: z.string().max(20).optional(),
    capacity: z.number().int().positive("Capacity must be greater than 0"),
    roomType: z.nativeEnum(RoomType).default(RoomType.LECTURE_HALL)
  })
});

export const updateClassroomSchema = z.object({
  body: createClassroomSchema.shape.body.partial(),
  params: z.object({
    id: z.string().uuid("Invalid Classroom ID")
  })
});

// ============================================================================
// TIMETABLE VALIDATORS
// ============================================================================

export const createTimetableSchema = z.object({
  body: z.object({
    academicSessionId: z.string().uuid(),
    classId: z.string().uuid(),
    sectionId: z.string().uuid()
  })
});

export const copyTimetableSchema = z.object({
  body: z.object({
    targetAcademicSessionId: z.string().uuid(),
    targetClassId: z.string().uuid(),
    targetSectionId: z.string().uuid()
  }),
  params: z.object({
    id: z.string().uuid("Invalid Source Timetable ID")
  })
});

// ============================================================================
// SLOT VALIDATORS
// ============================================================================

export const createTimetableSlotSchema = z.object({
  body: z.object({
    timetableId: z.string().uuid(),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    periodId: z.string().uuid(),
    subjectId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    classroomId: z.string().uuid().optional(),
    notes: z.string().max(500).optional()
  })
});

export const updateTimetableSlotSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid().nullable().optional(),
    teacherId: z.string().uuid().nullable().optional(),
    classroomId: z.string().uuid().nullable().optional(),
    notes: z.string().max(500).nullable().optional()
  }),
  params: z.object({
    id: z.string().uuid("Invalid Slot ID")
  })
});

// Types exports for inferred DTOs
export type CreatePeriodDto = z.infer<typeof createPeriodSchema>['body'];
export type CreateClassroomDto = z.infer<typeof createClassroomSchema>['body'];
export type CreateTimetableDto = z.infer<typeof createTimetableSchema>['body'];
export type CreateTimetableSlotDto = z.infer<typeof createTimetableSlotSchema>['body'];
export type CopyTimetableDto = z.infer<typeof copyTimetableSchema>['body'];