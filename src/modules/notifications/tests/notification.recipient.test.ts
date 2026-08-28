import { Role, PrismaClient } from '@prisma/client';
import { NotificationRecipientService } from '../services/notification-recipient.service';

describe('NotificationRecipientService', () => {
  let service: NotificationRecipientService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      student: {
        findMany: jest.fn(),
      },
      parentStudent: {
        findMany: jest.fn(),
      },
      classTeacherAssignment: {
        findMany: jest.fn(),
      },
      teacher: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    service = new NotificationRecipientService(mockPrisma as unknown as PrismaClient);
  });

  describe('resolveStudentsInClass', () => {
    it('should query non-deleted students in the given class and section', async () => {
      mockPrisma.student.findMany.mockResolvedValue([
        { id: 's-1', firstName: 'Alice', lastName: 'Smith' },
        { id: 's-2', firstName: 'Bob', lastName: 'Jones' },
      ]);

      const students = await service.resolveStudentsInClass(
        'school-1',
        'class-1',
        'section-1'
      );

      expect(mockPrisma.student.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-1',
          classId: 'class-1',
          sectionId: 'section-1',
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      expect(students).toHaveLength(2);
      expect(students[0]).toEqual({ id: 's-1', name: 'Alice Smith' });
    });
  });

  describe('resolveParentsOfStudents', () => {
    it('should query ParentStudent records where canReceiveNotifications is true', async () => {
      mockPrisma.parentStudent.findMany.mockResolvedValue([
        {
          parent: {
            userId: 'parent-user-1',
            firstName: 'John',
            lastName: 'Smith',
          },
          student: {
            id: 's-1',
            firstName: 'Alice',
            lastName: 'Smith',
          },
        },
      ]);

      const result = await service.resolveParentsOfStudents('school-1', ['s-1']);

      expect(mockPrisma.parentStudent.findMany).toHaveBeenCalledWith({
        where: {
          studentId: { in: ['s-1'] },
          canReceiveNotifications: true,
          parent: {
            schoolId: 'school-1',
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

      expect(result).toHaveLength(1);
      expect(result[0].parentUserId).toBe('parent-user-1');
      expect(result[0].parentName).toBe('John Smith');
      expect(result[0].studentName).toBe('Alice Smith');
    });
  });

  describe('resolveTeachersForClass', () => {
    it('should query class teacher assignments and return teacher userIds', async () => {
      mockPrisma.classTeacherAssignment.findMany.mockResolvedValue([
        { teacherId: 't-1' },
      ]);
      mockPrisma.teacher.findMany.mockResolvedValue([{ userId: 'teacher-user-1' }]);

      const teacherUserIds = await service.resolveTeachersForClass(
        'school-1',
        'class-1'
      );

      expect(teacherUserIds).toEqual(['teacher-user-1']);
    });
  });

  describe('resolveUsersByRoles', () => {
    it('should query active users matching specified roles', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'admin-1' },
        { id: 'admin-2' },
      ]);

      const userIds = await service.resolveUsersByRoles('school-1', [
        Role.SCHOOL_ADMIN,
        Role.SUPER_ADMIN,
      ]);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-1',
          role: { in: [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN] },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      expect(userIds).toEqual(['admin-1', 'admin-2']);
    });
  });
});
