import { Request, Response, NextFunction } from 'express';
import { teacherService } from '../services/teacher.service';

export class TeacherController {
  
  createTeacher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user!.schoolId!;
      const adminId = req.user!.id;
      
      const result = await teacherService.createTeacher(schoolId, adminId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getTeachers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user!.schoolId!;
      const result = await teacherService.getTeachers(schoolId, req.query);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getTeacherById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user!.schoolId!;
      const result = await teacherService.getTeacherById(schoolId, req.params.id as string);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  updateTeacher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user!.schoolId!;
      const adminId = req.user!.id;
      
      const result = await teacherService.updateTeacher(schoolId, req.params.id as string, req.body, adminId);
      
      res.status(200).json({
        success: true,
        message: 'Teacher updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user!.schoolId!;
      const adminId = req.user!.id;
      
      const result = await teacherService.updateStatus(schoolId, req.params.id as string, req.body.status, adminId);
      
      res.status(200).json({
        success: true,
        message: 'Teacher status updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  assignClassTeacher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user!.schoolId!;
      const adminId = req.user!.id;
      
      const result = await teacherService.assignClassTeacher(schoolId, req.params.id as string, req.body, adminId);
      
      res.status(200).json({
        success: true,
        message: 'Class assigned to teacher successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const teacherController = new TeacherController();