import { Request, Response, NextFunction } from 'express';
import { StudentAttendanceService } from '../services/student-attendance.service';

const studentAttendanceService = new StudentAttendanceService();

export class StudentAttendanceController {
  static async markBulkAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      // Assuming req.user is populated by your authentication middleware
      const schoolId = req.user!.schoolId!; 
      const markedBy = req.user!.id;
      const { academicSessionId, attendanceDate, records } = req.body;

      const result = await studentAttendanceService.markBulkAttendance(
        schoolId,
        academicSessionId,
        markedBy,
        attendanceDate,
        records
      );

      res.status(201).json({
        success: true,
        message: result.message,
        processedCount: result.processed,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const recordId = req.params.id as string;
      const schoolId = req.user!.schoolId!;
      const updaterId = req.user!.id;
      const updaterRole = req.user!.role; // Enum: SUPER_ADMIN, SCHOOL_ADMIN, DATA_ENTRY_ADMIN, etc.
      
      const { newStatus, reason } = req.body;

      const result = await studentAttendanceService.updateAttendance(
        recordId,
        schoolId,
        updaterId,
        updaterRole,
        newStatus,
        reason
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}