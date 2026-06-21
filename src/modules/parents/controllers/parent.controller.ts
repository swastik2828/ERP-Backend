import { Request, Response, NextFunction } from 'express';
import { ParentService } from '../services/parent.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

const parentService = new ParentService();

export class ParentController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.schoolId) {
        throw new AppError('Unauthorized: School ID missing', 401);
      }
      const schoolId = req.user.schoolId;
      const auditUserId = req.user.id;
      
      const { userId, ...parentData } = req.body; 

      const result = await parentService.createParent(schoolId, userId, parentData, auditUserId);
      sendSuccess(res, 201, result, 'Parent created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async linkStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parentId = req.params.id as string;
      const { studentId, relationshipType, isPrimaryGuardian, isEmergencyContact } = req.body;
      
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const auditUserId = req.user.id;

      const result = await parentService.linkStudent(
        parentId, studentId, { relationshipType, isPrimaryGuardian, isEmergencyContact }, auditUserId
      );
       sendSuccess(res, 200, result, 'Student linked successfully');
    } catch (error) {
      next(error);
    }
  }
  static async getParents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('Unauthorized', 401);
      const result = await parentService.getParents(req.user.schoolId, req.query);
       sendSuccess(res, 200, result, 'Parents retrieved');
    } catch (error) { next(error); }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('Unauthorized', 401);
      const result = await parentService.updateParent(req.params.id as string, req.user.schoolId, req.body, req.user.id);
       sendSuccess(res, 200, result, 'Parent updated');
    } catch (error) { next(error); }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('Unauthorized', 401);
      await parentService.deleteParent(req.params.id as string, req.user.schoolId, req.user.id);
      sendSuccess(res, 200, null, 'Parent deleted successfully');
    } catch (error) { next(error); }
  }
}