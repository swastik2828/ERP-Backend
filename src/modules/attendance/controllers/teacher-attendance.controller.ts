import { Request, Response, NextFunction } from 'express';
import { TeacherAttendanceService } from '../services/teacher-attendance.service';

const teacherAttendanceService = new TeacherAttendanceService();

export class TeacherAttendanceController {
  static async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user!.schoolId!;
      const recordedBy = req.user!.id;
      const { teacherId, remarks } = req.body;

      // Teachers usually check themselves in, but admins can also record it.
      // If a teacher is checking in, ensure they are checking themselves in.
      if (req.user!.role === 'TEACHER' && req.user!.id !== teacherId) {
         res.status(403).json({ success: false, message: 'Teachers can only check themselves in.' });
         return;
      }

      const result = await teacherAttendanceService.checkIn(teacherId, schoolId, recordedBy, remarks);

      res.status(201).json({
        success: true,
        message: 'Check-in successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user!.schoolId!;
      const recordedBy = req.user!.id;
      const { teacherId, remarks } = req.body;

      if (req.user!.role === 'TEACHER' && req.user!.id !== teacherId) {
         res.status(403).json({ success: false, message: 'Teachers can only check themselves out.' });
         return;
      }

      const result = await teacherAttendanceService.checkOut(teacherId, schoolId, recordedBy, remarks);

      res.status(200).json({
        success: true,
        message: 'Check-out successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}