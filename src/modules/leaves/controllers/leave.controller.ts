import { Request, Response, NextFunction } from 'express';
import { LeaveService } from '../services/leave.service';
import { LeaveRepository } from '../repositories/leave.repository';
import { LeaveApplicantType, LeaveStatus } from '@prisma/client';

const leaveService = new LeaveService();
const leaveRepository = new LeaveRepository();

export class LeaveController {
  public static async submitLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId as string;
      const submitterId = req.user?.id as string;
      const userRole = req.user?.role as string;

      const roleMapping: Record<string, LeaveApplicantType> = {
        STUDENT: LeaveApplicantType.STUDENT,
        PARENT: LeaveApplicantType.PARENT,
        TEACHER: LeaveApplicantType.TEACHER,
        STAFF: LeaveApplicantType.STAFF,
      };

      const applicantType = roleMapping[userRole] || LeaveApplicantType.STAFF;

      const leave = await leaveService.submitLeave(
        schoolId,
        submitterId,
        submitterId,
        applicantType,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Leave request submitted successfully',
        data: leave
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getMyLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId as string;
      const applicantId = req.user?.id as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const leaves = await leaveService.getMyLeaves(schoolId, applicantId, page, limit);

      res.status(200).json({
        success: true,
        message: 'Leave history retrieved successfully',
        data: leaves
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getReviewableLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId as string;
      const status = req.query.status as LeaveStatus | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const leaves = await leaveRepository.findAll(schoolId, { status, skip, take: limit });

      res.status(200).json({
        success: true,
        message: 'Reviewable leaves retrieved successfully',
        data: leaves
      });
    } catch (error) {
      next(error);
    }
  }

  public static async reviewLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId as string;
      const approverId = req.user?.id as string;
      const { id } = req.params; 

      const leave = await leaveService.reviewLeave(id as string, schoolId, approverId, req.body);

      res.status(200).json({
        success: true,
        message: `Leave request ${req.body.status.toLowerCase()} successfully`,
        data: leave
      });
    } catch (error) {
      next(error);
    }
  }

  public static async cancelLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId as string;
      const applicantId = req.user?.id as string;
      const { id } = req.params; 

      const leave = await leaveService.cancelLeave(id as string, schoolId, applicantId);

      res.status(200).json({
        success: true,
        message: 'Leave request cancelled successfully',
        data: leave
      });
    } catch (error) {
      next(error);
    }
  }
}