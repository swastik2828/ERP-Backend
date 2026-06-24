import { StudentAttendanceService } from '../services/student-attendance.service';
import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import { StudentAttendanceStatus, Role } from '@prisma/client';

// Mock Prisma
jest.mock('../../../database/prisma', () => ({
  __esModule: true,
  default: {
    student: { findMany: jest.fn() },
    attendanceRecord: { createMany: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    attendanceCorrectionRequest: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('StudentAttendanceService', () => {
  let service: StudentAttendanceService;

  beforeEach(() => {
    service = new StudentAttendanceService();
    jest.clearAllMocks();
  });

  describe('markBulkAttendance', () => {
    const mockSchoolId = 'school-1';
    const mockSessionId = 'session-1';
    const mockTeacherId = 'teacher-1';

    it('should successfully mark attendance for valid students and create audit log', async () => {
      const today = new Date().toISOString();
      const records = [{ studentId: 'student-1', status: StudentAttendanceStatus.PRESENT }];
      
      // Mock active student query
      (prisma.student.findMany as jest.Mock).mockResolvedValue([
        { id: 'student-1', admissionDate: new Date('2024-01-01') }
      ]);

      const result = await service.markBulkAttendance(mockSchoolId, mockSessionId, mockTeacherId, today, records);

      expect(result.processed).toBe(1);
      expect(prisma.attendanceRecord.createMany).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'ATTENDANCE_MARKED', actorId: mockTeacherId })
      });
    });

    it('should reject attendance for a future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      
      await expect(
        service.markBulkAttendance(mockSchoolId, mockSessionId, mockTeacherId, futureDate.toISOString(), [])
      ).rejects.toThrow(AppError);
    });

    it('should filter out students if attendance date is before admission date', async () => {
      const attendanceDateStr = '2024-02-01T00:00:00.000Z';
      const records = [{ studentId: 'student-1', status: StudentAttendanceStatus.PRESENT }];
      
      (prisma.student.findMany as jest.Mock).mockResolvedValue([
        { id: 'student-1', admissionDate: new Date('2024-03-01') } // Admission is AFTER attendance date
      ]);

      await expect(
        service.markBulkAttendance(mockSchoolId, mockSessionId, mockTeacherId, attendanceDateStr, records)
      ).rejects.toThrow('No valid active students found');
    });
  });

  describe('updateAttendance', () => {
    const mockRecordId = 'record-1';
    const mockSchoolId = 'school-1';
    
    it('should update attendance directly if within 24 hours', async () => {
      const recentDate = new Date(); // Created just now
      
      (prisma.attendanceRecord.findFirst as jest.Mock).mockResolvedValue({
        id: mockRecordId,
        status: 'ABSENT',
        createdAt: recentDate,
      });

      await service.updateAttendance(mockRecordId, mockSchoolId, 'teacher-1', Role.TEACHER, StudentAttendanceStatus.PRESENT, 'Mistake');

      expect(prisma.attendanceRecord.update).toHaveBeenCalled();
      expect(prisma.attendanceCorrectionRequest.create).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'ATTENDANCE_UPDATED' })
      });
    });

    it('should reject teacher updates if locked (>24 hours)', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); // 48 hours ago
      
      (prisma.attendanceRecord.findFirst as jest.Mock).mockResolvedValue({
        id: mockRecordId,
        createdAt: oldDate,
      });

      await expect(
        service.updateAttendance(mockRecordId, mockSchoolId, 'teacher-1', Role.TEACHER, StudentAttendanceStatus.PRESENT, 'Fix')
      ).rejects.toThrow(/Attendance locked/);
    });

    it('should allow admin updates on locked records via Correction Request', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); 
      
      (prisma.attendanceRecord.findFirst as jest.Mock).mockResolvedValue({
        id: mockRecordId,
        status: 'ABSENT',
        createdAt: oldDate,
      });

      await service.updateAttendance(mockRecordId, mockSchoolId, 'admin-1', Role.SCHOOL_ADMIN, StudentAttendanceStatus.PRESENT, 'Admin override');

      expect(prisma.attendanceCorrectionRequest.create).toHaveBeenCalled();
      expect(prisma.attendanceRecord.update).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'ATTENDANCE_CORRECTED' })
      });
    });
  });
});