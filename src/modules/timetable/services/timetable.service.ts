import { AppError } from '../../../errors/AppError';
import { TimetableRepository } from '../repositories/timetable.repository';
import { TimetableConflictRepository } from '../repositories/timetable-conflict.repository';
import { CreateTimetableDto, CreateTimetableSlotDto, CopyTimetableDto } from '../validators/timetable.validator';

export class TimetableService {
  
  static async createDraftTimetable(schoolId: string, data: CreateTimetableDto) {
    return TimetableRepository.createDraft(schoolId, data);
  }

  static async getTimetableDetails(id: string) {
    const timetable = await TimetableRepository.findById(id);
    if (!timetable) throw new AppError('Timetable not found', 404);
    return timetable;
  }

  static async publishTimetable(id: string, userId: string) {
    const timetable = await TimetableRepository.findById(id);
    
    if (!timetable) throw new AppError('Timetable not found', 404);
    if (timetable.status === 'PUBLISHED') throw new AppError('Timetable is already published', 400);
    
    // Additional validation could go here (e.g., ensure minimum slots are filled)
    
    return TimetableRepository.publish(id, userId);
  }

  static async addSlot(data: CreateTimetableSlotDto) {
    const timetable = await TimetableRepository.findById(data.timetableId);
    if (!timetable) throw new AppError('Timetable not found', 404);
    if (timetable.status === 'PUBLISHED') throw new AppError('Cannot edit a published timetable', 400);

    // 1. Conflict Check: Duplicate Slot
    const duplicate = await TimetableConflictRepository.checkDuplicateSlot(data.timetableId, data.dayOfWeek, data.periodId);
    if (duplicate) throw new AppError(`A slot already exists for ${data.dayOfWeek} in this period`, 409);

    // 2. Conflict Check: Teacher Overlap
    if (data.teacherId) {
      const teacherConflict = await TimetableConflictRepository.checkTeacherConflict(data.teacherId, data.dayOfWeek, data.periodId);
      if (teacherConflict) {
        throw new AppError(
          `Teacher conflict: Already assigned to ${teacherConflict.timetable.class.name} Section ${teacherConflict.timetable.section.name}`,
          409
        );
      }
    }

    // 3. Conflict Check: Classroom Overlap
    if (data.classroomId) {
      const classroomConflict = await TimetableConflictRepository.checkClassroomConflict(data.classroomId, data.dayOfWeek, data.periodId);
      if (classroomConflict) {
        throw new AppError(
          `Classroom conflict: Room is already booked for Class ${classroomConflict.timetable.class.name}`, 
          409
        );
      }
    }

    return TimetableRepository.createSlot(data);
  }

  static async copyTimetable(sourceId: string, schoolId: string, data: CopyTimetableDto) {
    const source = await TimetableRepository.findById(sourceId);
    if (!source) throw new AppError('Source timetable not found', 404);

    // Target target format mapped to our DTO
    const targetData: CreateTimetableDto = {
      academicSessionId: data.targetAcademicSessionId,
      classId: data.targetClassId,
      sectionId: data.targetSectionId,
    };

    // Note: In a robust copy feature, you'd re-run conflict checks for all slots here. 
    // To maintain performance (< 1s rule from PRD), we run it inside the transaction.
    return TimetableRepository.copyTimetableTx(sourceId, targetData, schoolId);
  }
}