import { TeacherAttendanceService } from '../services/teacher-attendance.service';
import prisma from '../../../database/prisma';
// import { AppError } from '../../../errors/AppError';

jest.mock('../../../database/prisma', () => ({
  __esModule: true,
  default: {
    teacher: { findFirst: jest.fn() },
    teacherAttendance: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

describe('TeacherAttendanceService', () => {
  let service: TeacherAttendanceService;

  beforeEach(() => {
    service = new TeacherAttendanceService();
    jest.clearAllMocks();
  });

  const mockTeacherId = 'teacher-1';
  const mockSchoolId = 'school-1';

  describe('checkIn', () => {
    it('should successfully check in an active teacher', async () => {
      (prisma.teacher.findFirst as jest.Mock).mockResolvedValue({ id: mockTeacherId, status: 'ACTIVE' });
      (prisma.teacherAttendance.findFirst as jest.Mock).mockResolvedValue(null); // No existing check-in

      (prisma.teacherAttendance.create as jest.Mock).mockResolvedValue({ id: 'record-1', checkInTime: new Date() });

      await service.checkIn(mockTeacherId, mockSchoolId, mockTeacherId, 'On time');

      expect(prisma.teacherAttendance.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'CHECKIN_CREATED' })
      });
    });

    it('should reject duplicate check-in', async () => {
      (prisma.teacher.findFirst as jest.Mock).mockResolvedValue({ id: mockTeacherId, status: 'ACTIVE' });
      (prisma.teacherAttendance.findFirst as jest.Mock).mockResolvedValue({ checkInTime: new Date() }); // Already checked in

      await expect(
        service.checkIn(mockTeacherId, mockSchoolId, mockTeacherId)
      ).rejects.toThrow(/already checked in/);
    });
  });

  describe('checkOut', () => {
    it('should successfully check out if checked in', async () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 4); // Checked in 4 hours ago

      (prisma.teacherAttendance.findFirst as jest.Mock).mockResolvedValue({ 
        id: 'record-1', 
        checkInTime: pastTime 
      });

      (prisma.teacherAttendance.update as jest.Mock).mockResolvedValue({ id: 'record-1', checkOutTime: new Date() });

      await service.checkOut(mockTeacherId, mockSchoolId, mockTeacherId);

      expect(prisma.teacherAttendance.update).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'CHECKOUT_CREATED' })
      });
    });

    it('should reject check-out without check-in', async () => {
      (prisma.teacherAttendance.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.checkOut(mockTeacherId, mockSchoolId, mockTeacherId)
      ).rejects.toThrow(/No check-in found/);
    });
  });
});