import { Request, Response, NextFunction } from 'express';
import { StudentService } from '../services/student.service';
import { sendSuccess } from '../../../utils/response.util';

export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  admitStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TypeScript guarantees schoolId exists due to the tenant middleware
      const schoolId = req.user!.schoolId!; 
      const creatorId = req.user!.id;

      const result = await this.studentService.admitStudent(req.body, schoolId, creatorId);
      sendSuccess(res, 201, result, 'Student admitted successfully');
    } catch (error) {
      next(error);
    }
  };

  getStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.user!.schoolId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const classId = req.query.classId as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await this.studentService.getStudents(schoolId, page, limit, classId, search);
      sendSuccess(res, 200, result.data, 'Students retrieved', { total: result.total });
    } catch (error) {
      next(error);
    }
  };
}