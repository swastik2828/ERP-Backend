import { Request, Response, NextFunction } from 'express';
import { AttendanceReportService } from '../services/attendance-report.service';
import { AppError } from '../../../errors/AppError';
import prisma from '../../../database/prisma';

const reportService = new AttendanceReportService();

export class AttendanceReportController {
  static async getStudentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      // FIX: Explicitly cast to string
      const studentId = req.params.studentId as string; 
      const schoolId = req.user!.schoolId!;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      if (req.user!.role === 'PARENT') {
        const parentMapping = await prisma.parentStudent.findUnique({
          where: { parentId_studentId: { parentId: req.user!.id, studentId } }
        });
        if (!parentMapping) throw new AppError('Unauthorized to view this student', 403);
      }

      if (req.user!.role === 'STUDENT' && req.user!.id !== studentId) {
         throw new AppError('Unauthorized to view other students', 403);
      }

      const history = await reportService.getStudentHistory(studentId, schoolId, startDate, endDate);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  static async getStudentSummary(req: Request, res: Response, next: NextFunction) {
    try {
      // FIX: Explicitly cast to string
      const studentId = req.params.studentId as string; 
      const schoolId = req.user!.schoolId!;
      const academicSessionId = req.query.academicSessionId as string;

      if (!academicSessionId) throw new AppError('academicSessionId query parameter is required', 400);

      const summary = await reportService.getStudentSummary(studentId, schoolId, academicSessionId);
      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  static async getClassSheet(req: Request, res: Response, next: NextFunction) {
    try {
      // FIX: Explicitly cast to string
      const classId = req.params.classId as string;
      const date = req.params.date as string;
      const schoolId = req.user!.schoolId!;

      const sheet = await reportService.getClassAttendanceSheet(classId, schoolId, date);
      res.status(200).json({ success: true, data: sheet });
    } catch (error) {
      next(error);
    }
  }

  static async getDefaulters(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user!.schoolId!;
      const academicSessionId = req.query.academicSessionId as string;
      const threshold = req.query.threshold ? Number(req.query.threshold) : 75;

      if (!academicSessionId) throw new AppError('academicSessionId query parameter is required', 400);

      const report = await reportService.getDefaulterReport(schoolId, academicSessionId, threshold);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
}