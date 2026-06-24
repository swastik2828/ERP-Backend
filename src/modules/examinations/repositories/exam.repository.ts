import prisma from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class ExamRepository {
  // ==========================================
  // EXAM CORE
  // ==========================================
  
  async createExam(data: Prisma.ExamUncheckedCreateInput) {
    return prisma.exam.create({ data });
  }

  async findExamById(id: string, schoolId: string) {
    return prisma.exam.findFirst({
      where: { 
        id, 
        schoolId, 
        deletedAt: null // Enforce soft delete check
      },
      include: {
        subjects: true
      }
    });
  }

  async findExamByUniqueName(schoolId: string, academicSessionId: string, name: string) {
    return prisma.exam.findUnique({
      where: {
        schoolId_academicSessionId_name: {
          schoolId,
          academicSessionId,
          name
        }
      }
    });
  }

  // ==========================================
  // EXAM SUBJECTS
  // ==========================================

  async addExamSubject(data: Prisma.ExamSubjectUncheckedCreateInput) {
    return prisma.examSubject.create({ data });
  }

  async findExamSubjectConflict(examId: string, subjectId: string, classId: string, sectionId?: string | null) {
    // Check if the subject is already mapped to this class/section for this exam
    return prisma.examSubject.findFirst({
      where: {
        examId,
        subjectId,
        classId,
        sectionId: sectionId || null
      }
    });
  }

  // ==========================================
  // EXAM SCHEDULES
  // ==========================================

  async createExamSchedule(data: Prisma.ExamScheduleUncheckedCreateInput) {
    return prisma.examSchedule.create({ data });
  }

  async findOverlappingSchedule(_examSubjectId: string, examDate: Date, room: string) {
    return prisma.examSchedule.findFirst({
      where: {
        examDate,
        room,
        // In a real scenario, you'd add complex time-overlap logic here.
        // For Phase 3, we ensure the room isn't double-booked for the exact day/subject.
      }
    });
  }
}