import { Request, Response, NextFunction } from 'express';
import { StudentService } from '../services/student.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

const studentService = new StudentService();

export class StudentController {
  
  static async promote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { newClassId, newSectionId, academicSessionId, reason } = req.body;
      
      if (!req.user || !req.user.schoolId) {
        throw new AppError('Unauthorized: School ID missing', 401);
      }
      const schoolId = req.user.schoolId;
      const auditUserId = req.user.id;

      const result = await studentService.promoteStudent(
        id, schoolId, { newClassId, newSectionId, academicSessionId, reason }, auditUserId
      );

      sendSuccess(res, 200, result, 'Student promoted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      
      if (!req.user || !req.user.schoolId) {
        throw new AppError('Unauthorized: School ID missing', 401);
      }
      const schoolId = req.user.schoolId;
      const auditUserId = req.user.id;

      const result = await studentService.transferStudent(id, schoolId, req.body, auditUserId);
      sendSuccess(res, 200, result, 'Student transferred successfully');
    } catch (error) {
      next(error);
    }
  }

  static async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      
      if (!req.user || !req.user.schoolId) {
        throw new AppError('Unauthorized: School ID missing', 401);
      }
      const schoolId = req.user.schoolId;
      const auditUserId = req.user.id;

      const result = await studentService.withdrawStudent(id, schoolId, req.body, auditUserId);
      sendSuccess(res, 200, result, 'Student withdrawn successfully');
    } catch (error) {
      next(error);
    }
  }

  static async graduate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { finalSessionId } = req.body;
      
      if (!req.user || !req.user.schoolId) {
        throw new AppError('Unauthorized: School ID missing', 401);
      }
      const schoolId = req.user.schoolId;
      const auditUserId = req.user.id;

      const result = await studentService.graduateStudent(id, schoolId, finalSessionId, auditUserId);
      sendSuccess(res, 200, result, 'Student graduated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('Unauthorized', 401);
      const result = await studentService.createStudent(req.user.schoolId, req.body, req.user.id);
      sendSuccess(res, 201, result, 'Student admitted successfully');
    } catch (error) { next(error); }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('Unauthorized', 401);
      const result = await studentService.updateStudent(req.params.id as string, req.user.schoolId, req.body, req.user.id);
      sendSuccess(res, 200, result, 'Student profile updated');
    } catch (error) { next(error); }
  }

  static async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('Unauthorized', 401);
      const result = await studentService.reactivateStudent(req.params.id as string, req.user.schoolId, req.user.id);
      sendSuccess(res, 200, result, 'Student reactivated');
    } catch (error) { next(error); }
  } 
}