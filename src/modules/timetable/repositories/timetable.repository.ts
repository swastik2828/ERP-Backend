// import { Prisma } from '@prisma/client';
import { prisma } from '../../../database/prisma';
import { CreateTimetableDto, CreateTimetableSlotDto } from '../validators/timetable.validator';

export class TimetableRepository {
  // =====================================
  // TIMETABLE CORE
  // =====================================
  
  static async createDraft(schoolId: string, data: CreateTimetableDto) {
    // Determine next version number
    const existing = await prisma.timetable.findFirst({
      where: {
        schoolId,
        academicSessionId: data.academicSessionId,
        classId: data.classId,
        sectionId: data.sectionId,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = existing ? existing.version + 1 : 1;

    return prisma.timetable.create({
      data: {
        schoolId,
        academicSessionId: data.academicSessionId,
        classId: data.classId,
        sectionId: data.sectionId,
        version: nextVersion,
        status: 'DRAFT',
      },
    });
  }

  static async findById(id: string) {
    return prisma.timetable.findUnique({
      where: { id },
      include: {
        slots: {
          include: { period: true, subject: true, teacher: true, classroom: true },
        },
      },
    });
  }

  static async publish(id: string, publishedBy: string) {
    return prisma.timetable.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedBy,
        publishedAt: new Date(),
      },
    });
  }

  // =====================================
  // SLOTS
  // =====================================
  
  static async createSlot(data: CreateTimetableSlotDto) {
    return prisma.timetableSlot.create({
      data: {
        timetableId: data.timetableId,
        dayOfWeek: data.dayOfWeek,
        periodId: data.periodId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        classroomId: data.classroomId,
        notes: data.notes,
      },
    });
  }

  // Transaction for Deep Copy
  static async copyTimetableTx(sourceTimetableId: string, targetData: CreateTimetableDto, schoolId: string) {
    return prisma.$transaction(async (tx) => {
      const sourceSlots = await tx.timetableSlot.findMany({
        where: { timetableId: sourceTimetableId },
      });

      // Create new draft timetable
      const newTimetable = await tx.timetable.create({
        data: {
          schoolId,
          ...targetData,
          version: 1, // Start at version 1 for new target
          status: 'DRAFT',
        },
      });

      // Map slots to new timetable
      const newSlotsData = sourceSlots.map(slot => ({
        timetableId: newTimetable.id,
        dayOfWeek: slot.dayOfWeek,
        periodId: slot.periodId,
        subjectId: slot.subjectId,
        teacherId: slot.teacherId,
        classroomId: slot.classroomId,
        notes: slot.notes,
      }));

      if (newSlotsData.length > 0) {
        await tx.timetableSlot.createMany({ data: newSlotsData });
      }

      return newTimetable;
    });
  }
}