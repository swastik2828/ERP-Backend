import { DayOfWeek } from '@prisma/client';
import { prisma } from '../../../database/prisma';

export class TimetableConflictRepository {
  /**
   * Checks if a teacher is already assigned to another class during the given period & day.
   */
  static async checkTeacherConflict(
    teacherId: string,
    dayOfWeek: DayOfWeek,
    periodId: string,
    excludeSlotId?: string
  ) {
    return prisma.timetableSlot.findFirst({
      where: {
        teacherId,
        dayOfWeek,
        periodId,
        id: excludeSlotId ? { not: excludeSlotId } : undefined,
        timetable: {
          status: { in: ['DRAFT', 'PUBLISHED'] }, // Ignore archived timetables
        },
      },
      include: {
        timetable: {
          include: { class: true, section: true },
        },
      },
    });
  }

  /**
   * Checks if a classroom is already occupied during the given period & day.
   */
  static async checkClassroomConflict(
    classroomId: string,
    dayOfWeek: DayOfWeek,
    periodId: string,
    excludeSlotId?: string
  ) {
    return prisma.timetableSlot.findFirst({
      where: {
        classroomId,
        dayOfWeek,
        periodId,
        id: excludeSlotId ? { not: excludeSlotId } : undefined,
        timetable: {
          status: { in: ['DRAFT', 'PUBLISHED'] },
        },
      },
      include: {
        timetable: {
          include: { class: true, section: true },
        },
      },
    });
  }

  /**
   * Checks if a slot already exists for the given timetable, day, and period.
   */
  static async checkDuplicateSlot(
    timetableId: string,
    dayOfWeek: DayOfWeek,
    periodId: string,
    excludeSlotId?: string
  ) {
    return prisma.timetableSlot.findFirst({
      where: {
        timetableId,
        dayOfWeek,
        periodId,
        id: excludeSlotId ? { not: excludeSlotId } : undefined,
      },
    });
  }
}