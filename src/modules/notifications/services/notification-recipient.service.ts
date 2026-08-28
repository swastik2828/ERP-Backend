import { Role } from '@prisma/client';
import prisma from '../../../database/prisma';

export interface ResolvedParentInfo {
  parentUserId: string;
  parentName: string;
  studentId: string;
  studentName: string;
}

export class NotificationRecipientService {
  constructor(private readonly db: typeof prisma = prisma) {}

  /**
   * Resolves student IDs for a class and optional section
   */
  public async resolveStudentsInClass(
    schoolId: string,
    classId: string,
    sectionId?: string
  ): Promise<Array<{ id: string; name: string }>> {
    const where: any = {
      schoolId,
      classId,
      deletedAt: null,
    };
    if (sectionId) {
      where.sectionId = sectionId;
    }

    const students = await this.db.student.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    return students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
    }));
  }

  /**
   * Resolves parent user IDs for a list of student IDs
   */
  public async resolveParentsOfStudents(
    schoolId: string,
    studentIds: string[]
  ): Promise<ResolvedParentInfo[]> {
    if (studentIds.length === 0) return [];

    const parentStudents = await this.db.parentStudent.findMany({
      where: {
        studentId: { in: studentIds },
        canReceiveNotifications: true,
        parent: {
          schoolId,
          deletedAt: null,
        },
      },
      include: {
        parent: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return parentStudents.map((ps) => ({
      parentUserId: ps.parent.userId,
      parentName: `${ps.parent.firstName} ${ps.parent.lastName}`.trim(),
      studentId: ps.student.id,
      studentName: `${ps.student.firstName} ${ps.student.lastName}`.trim(),
    }));
  }

  /**
   * Resolves parent user IDs for a single student ID
   */
  public async resolveParentsForSingleStudent(
    schoolId: string,
    studentId: string
  ): Promise<ResolvedParentInfo[]> {
    return this.resolveParentsOfStudents(schoolId, [studentId]);
  }

  /**
   * Resolves teacher user IDs for a class/section
   */
  public async resolveTeachersForClass(
    schoolId: string,
    classId: string,
    sectionId?: string
  ): Promise<string[]> {
    const where: any = {
      schoolId,
      classId,
    };
    if (sectionId) {
      where.sectionId = sectionId;
    }

    const assignments = await this.db.classTeacherAssignment.findMany({
      where,
      select: {
        teacherId: true,
      },
    });

    const teacherIds = assignments.map((a) => a.teacherId);
    if (teacherIds.length === 0) return [];

    const teachers = await this.db.teacher.findMany({
      where: {
        id: { in: teacherIds },
        schoolId,
        deletedAt: null,
      },
      select: {
        userId: true,
      },
    });

    return teachers.map((t) => t.userId);
  }

  /**
   * Resolves user IDs by roles (e.g. SCHOOL_ADMIN, SUPER_ADMIN, TEACHER)
   */
  public async resolveUsersByRoles(
    schoolId: string,
    roles: Role[]
  ): Promise<string[]> {
    const users = await this.db.user.findMany({
      where: {
        schoolId,
        role: { in: roles },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return users.map((u) => u.id);
  }

  /**
   * Resolves teacher userId from teacher entity id
   */
  public async resolveTeacherUserId(
    schoolId: string,
    teacherId: string
  ): Promise<string | null> {
    const teacher = await this.db.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
        deletedAt: null,
      },
      select: {
        userId: true,
      },
    });

    return teacher?.userId || null;
  }
}

export const notificationRecipientService = new NotificationRecipientService();
