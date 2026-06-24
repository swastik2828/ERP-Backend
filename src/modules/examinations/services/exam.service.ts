import { ExamRepository } from '../repositories/exam.repository';
import { CreateExamDto, AddExamSubjectDto, CreateExamScheduleDto } from '../validators/exam.validator';
import { AppError } from '../../../errors/AppError';
import prisma from '../../../database/prisma';

export class ExamService {
  private examRepository: ExamRepository;

  constructor() {
    this.examRepository = new ExamRepository();
  }

  /**
   * Creates a new Examination
   */
  async createExam(data: CreateExamDto, schoolId: string, userId: string, ipAddress?: string) {
    // 1. Business Rule: Reject duplicate exam names in the same session
    const existingExam = await this.examRepository.findExamByUniqueName(schoolId, data.academicSessionId, data.name);
    if (existingExam) {
      throw new AppError('An exam with this name already exists for the selected academic session.', 400);
    }

    // 2. Create Exam & Audit Log in a transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          ...data,
          schoolId,
          createdBy: userId,
        }
      });

      // 3. Create Audit Log (PRD Requirement)
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'EXAM_CREATED',
          entityType: 'EXAM',
          entityId: exam.id,
          ipAddress: ipAddress || null,
        }
      });

      return exam;
    });

    return result;
  }

  /**
   * Maps a Subject to an Examination
   */
  async addExamSubject(examId: string, data: AddExamSubjectDto, schoolId: string, _userId: string) {
    // 1. Verify Exam exists and belongs to the school
    const exam = await this.examRepository.findExamById(examId, schoolId);
    if (!exam) throw new AppError('Examination not found or access denied.', 404);
    if (exam.isLocked || exam.isPublished) throw new AppError('Cannot modify subjects for a locked or published exam.', 403);

    // 2. Prevent duplicate subject mappings
    const conflict = await this.examRepository.findExamSubjectConflict(examId, data.subjectId, data.classId, data.sectionId);
    if (conflict) {
      throw new AppError('This subject is already mapped to the specified class/section for this exam.', 400);
    }

    // 3. Add Subject
    const examSubject = await this.examRepository.addExamSubject({
      ...data,
      examId,
    });

    return examSubject;
  }

  /**
   * Schedules an Exam Subject
   */
  async scheduleExam(examId: string, data: CreateExamScheduleDto, schoolId: string) {
    // 1. Verify Exam exists
    const exam = await this.examRepository.findExamById(examId, schoolId);
    if (!exam) throw new AppError('Examination not found or access denied.', 404);

    // 2. Prevent overlapping room schedules
    if (data.room) {
      const parsedDate = new Date(data.examDate);
      const overlap = await this.examRepository.findOverlappingSchedule(data.examSubjectId, parsedDate, data.room);
      if (overlap) {
         throw new AppError('Room scheduling conflict detected for this date.', 409);
      }
    }

    // 3. Format Date/Times for Database
    const scheduleDate = new Date(data.examDate);
    const startTime = new Date(`1970-01-01T${data.startTime}:00Z`);
    const endTime = new Date(`1970-01-01T${data.endTime}:00Z`);

    // 4. Create Schedule
    const schedule = await this.examRepository.createExamSchedule({
      examSubjectId: data.examSubjectId,
      examDate: scheduleDate,
      startTime: startTime,
      endTime: endTime,
      room: data.room,
      invigilatorId: data.invigilatorId
    });

    return schedule;
  }
}