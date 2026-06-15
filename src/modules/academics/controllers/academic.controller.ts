import { Request, Response, NextFunction } from 'express';
import { AcademicService } from '../services/academic.service';
import { sendSuccess } from '../../../utils/response.util';

export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  createClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.academicService.createClass(req.body, req.user!.schoolId!, req.user!.id);
      sendSuccess(res, 201, result, 'Class created successfully');
    } catch (error) { next(error); }
  };

  getClasses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.academicService.getClasses(req.user!.schoolId!, req.query as any);
      sendSuccess(res, 200, result.data, 'Classes retrieved', { total: result.total });
    } catch (error) { next(error); }
  };

  updateClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.academicService.updateClass(req.params.id as string, req.user!.schoolId!, req.body, req.user!.id);
      sendSuccess(res, 200, result, 'Class updated successfully');
    } catch (error) { next(error); }
  };

  archiveClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.academicService.archiveClass(req.params.id as string, req.user!.schoolId!, req.user!.id);
      sendSuccess(res, 200, null, 'Class archived successfully');
    } catch (error) { next(error); }
  };

  createSection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.academicService.createSection(req.body, req.user!.schoolId!);
      sendSuccess(res, 201, result, 'Section created successfully');
    } catch (error) { next(error); }
  };

  getSections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.academicService.getSections(req.user!.schoolId!, req.query as any);
      sendSuccess(res, 200, result.data, 'Sections retrieved', { total: result.total });
    } catch (error) { next(error); }
  };

  archiveSection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.academicService.archiveSection(req.params.id as string, req.user!.schoolId!);
      sendSuccess(res, 200, null, 'Section archived successfully');
    } catch (error) { next(error); }
  };

  assignTeacher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.academicService.assignClassTeacher(req.body, req.user!.schoolId!);
      sendSuccess(res, 201, result, 'Teacher assigned successfully');
    } catch (error) { next(error); }
  };

  bulkCreateClasses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.academicService.bulkCreate(req.body, req.user!.schoolId!, req.user!.id);
      sendSuccess(res, 201, result, 'Bulk creation successful');
    } catch (error) { next(error); }
  };
}