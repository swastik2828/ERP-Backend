import { z } from 'zod';
import { StudentAttendanceStatus } from '@prisma/client';

// ==========================================
// STUDENT ATTENDANCE VALIDATORS
// ==========================================

export const bulkStudentAttendanceSchema = z.object({
  body: z.object({
    academicSessionId: z.string().uuid(),
    classId: z.string().uuid(),
    attendanceDate: z.string().refine((date) => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime()) && parsedDate <= new Date(); // Date cannot exceed current date [cite: 211]
    }, { message: "Invalid date or date is in the future" }),
    records: z.array(
      z.object({
        studentId: z.string().uuid(),
        status: z.nativeEnum(StudentAttendanceStatus),
        remarks: z.string().optional(),
      })
    ).min(1, "At least one attendance record is required"),
  }),
});

export const updateAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid(), // Attendance Record ID
  }),
  body: z.object({
    newStatus: z.nativeEnum(StudentAttendanceStatus),
    reason: z.string().min(5, "Reason is required for attendance correction"), // Triggers correction workflow [cite: 142, 162]
  }),
});

// ==========================================
// TEACHER ATTENDANCE VALIDATORS
// ==========================================

export const teacherCheckInSchema = z.object({
  body: z.object({
    teacherId: z.string().uuid(),
    remarks: z.string().optional(),
  }),
});

export const teacherCheckOutSchema = z.object({
  body: z.object({
    teacherId: z.string().uuid(),
    remarks: z.string().optional(),
  }),
});

// ==========================================
// REPORT & HISTORY VALIDATORS
// ==========================================

export const attendanceReportQuerySchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    classId: z.string().uuid().optional(),
    threshold: z.string().transform(Number).optional(), // Configurable threshold for defaulters [cite: 263, 266]
    page: z.string().transform(Number).default(1),
    limit: z.string().transform(Number).default(50),
  }),
});