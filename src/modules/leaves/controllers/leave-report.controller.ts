import { Request, Response, NextFunction } from 'express';
import { LeaveReportService } from '../services/leave-report.service';
import { LeaveStatus } from '@prisma/client';

const leaveReportService = new LeaveReportService();

export class LeaveReportController {
  public static async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId as string;
      const stats = await leaveReportService.getStatistics(schoolId);

      res.status(200).json({
        success: true,
        message: 'Leave statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId as string;
      const { startDate, endDate, status } = req.query;

      const report = await leaveReportService.getReport(schoolId, {
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as LeaveStatus
      });

      res.status(200).json({
        success: true,
        message: 'Leave report generated successfully',
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
}