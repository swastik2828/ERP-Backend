import { Request, Response, NextFunction } from 'express';
import { SubjectService } from '../services/subject.service';
import { SubjectRepository } from '../repositories/subject.repository';
import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';

export class SubjectController {
  static async createSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.schoolId) throw new AppError('Unauthorized', 401);

      const subject = await SubjectService.createSubject(user.schoolId, user.id, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Subject created successfully',
        data: subject,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.schoolId) throw new AppError('Unauthorized', 401);
      
      // Explicitly cast req.params.id as a string to satisfy TypeScript
      const id = req.params.id as string; 

      const subject = await SubjectService.updateSubject(user.schoolId, user.id, id, req.body);

      res.status(200).json({
        success: true,
        message: 'Subject updated successfully',
        data: subject,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivateSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.schoolId) throw new AppError('Unauthorized', 401);
      
      const id = req.params.id as string;

      const subject = await SubjectService.deactivateSubject(user.schoolId, user.id, id);

      res.status(200).json({
        success: true,
        message: 'Subject deactivated successfully',
        data: subject,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.schoolId) throw new AppError('Unauthorized', 401);
      
      const id = req.params.id as string;

      const subject = await SubjectRepository.findById(id, user.schoolId);

      if (!subject) {
        res.status(404).json({ success: false, message: 'Subject not found' });
        return;
      }

      res.status(200).json({ success: true, data: subject });
    } catch (error) {
      next(error);
    }
  }

  static async listSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.schoolId) throw new AppError('Unauthorized', 401);
      
      const result = await SubjectService.listSubjects(user.schoolId, req.query);

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 10,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Curriculum Mapping ---

  static async addCurriculumMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.schoolId) throw new AppError('Unauthorized', 401);

      const mapping = await SubjectService.addCurriculumMapping(user.schoolId, user.id, req.body);

      res.status(201).json({
        success: true,
        message: 'Subject mapped to class successfully',
        data: mapping,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listCurriculumMappings(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.schoolId) throw new AppError('Unauthorized', 401);
      
      const academicSessionId = req.query.academicSessionId as string | undefined;
      const classId = req.query.classId as string | undefined;

      const mappings = await prisma.curriculumMap.findMany({
        where: {
          schoolId: user.schoolId,
          ...(academicSessionId && { academicSessionId }),
          ...(classId && { classId }),
        },
        include: { subject: true, class: true },
      });

      res.status(200).json({ success: true, data: mappings });
    } catch (error) {
      next(error);
    }
  }

  static async removeCurriculumMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.schoolId) throw new AppError('Unauthorized', 401);
      
      const id = req.params.id as string;

      await SubjectService.removeCurriculumMapping(user.schoolId, user.id, id);

      res.status(200).json({
        success: true,
        message: 'Curriculum mapping removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}