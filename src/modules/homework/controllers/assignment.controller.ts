import { Request, Response, NextFunction } from 'express';
import { AssignmentService } from '../services/assignment.service';
import { CreateAssignmentSchema } from '../dtos/assignment.dto';

export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  public createAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = CreateAssignmentSchema.parse(req.body);

      // Strict checks against your existing AuthUserContext
      if (!req.user) throw new Error('Unauthorized: User not found in request');
      if (!req.user.schoolId) throw new Error('Unauthorized: Tenant schoolId is missing');
      
      const schoolId = req.user.schoolId;
      const teacherId = req.user.id;

      const assignment = await this.assignmentService.createAssignment(
        schoolId,
        teacherId,
        validatedData
      );

      res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  };

  public publishAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignmentId = req.params.id as string;
      
      if (!req.user) throw new Error('Unauthorized');
      if (!req.user.schoolId) throw new Error('Unauthorized: Tenant schoolId is missing');

      const schoolId = req.user.schoolId;
      const teacherId = req.user.id;

      const assignment = await this.assignmentService.publishAssignment(
        assignmentId,
        schoolId,
        teacherId
      );

      res.status(200).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  };

  public deleteAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignmentId = req.params.id as string;
      
      if (!req.user) throw new Error('Unauthorized');
      if (!req.user.schoolId) throw new Error('Unauthorized: Tenant schoolId is missing');

      const schoolId = req.user.schoolId;
      const userId = req.user.id;

      await this.assignmentService.deleteAssignment(assignmentId, schoolId, userId);

      res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}