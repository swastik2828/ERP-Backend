import { Request, Response, NextFunction } from 'express';
import { ExamService } from '../services/exam.service';
import { MarkService } from '../services/mark.service';
import { ResultService } from '../services/result.service';
import { ReportCardService } from '../services/report-card.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

export class ExamController {
  private examService: ExamService;
  private markService: MarkService;
  private resultService: ResultService;
  private reportCardService: ReportCardService;

  constructor() {
    this.examService = new ExamService();
    this.markService = new MarkService();
    this.resultService = new ResultService();
    this.reportCardService = new ReportCardService();
  }

  createExam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const exam = await this.examService.createExam(
        req.body,
        req.user!.schoolId!,
        req.user!.id,
        req.ip
      );
      sendSuccess(res, 201, exam, 'Examination created successfully');
    } catch (error) {
      next(error);
    }
  };

  addSubject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const examId = req.params.examId as string;
      const subject = await this.examService.addExamSubject(
        examId,
        req.body,
        req.user!.schoolId!,
        req.user!.id
      );
      sendSuccess(res, 201, subject, 'Subject mapped to examination successfully');
    } catch (error) {
      next(error);
    }
  };

  bulkEnterMarks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.markService.bulkEnterMarks(
        req.body.marks,
        req.user!.schoolId!,
        req.user!.id,
        req.ip
      );
      sendSuccess(res, 200, result, `Successfully recorded ${result.count} mark entries`);
    } catch (error) {
      next(error);
    }
  };

  verifyMarks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { examSubjectId, studentIds } = req.body;
      const result = await this.markService.verifyMarks(
        examSubjectId,
        studentIds,
        req.user!.schoolId!,
        req.user!.id,
        req.ip
      );
      sendSuccess(res, 200, result, `Successfully verified ${result.verifiedCount} mark entries`);
    } catch (error) {
      next(error);
    }
  };

  generateResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { examId, classId } = req.body;
      const results = await this.resultService.generateClassResults(
        examId,
        classId,
        req.user!.schoolId!,
        req.user!.id,
        req.ip
      );
      sendSuccess(res, 201, results, `Successfully generated results for class`);
    } catch (error) {
      next(error);
    }
  };

  getReportCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.studentId as string;
      const examId = req.query.examId as string;

      if (!examId) {
        throw new AppError('examId query parameter is required', 400);
      }

      const reportCard = await this.reportCardService.generateStudentReportCard(
        studentId,
        examId,
        req.user!.schoolId!
      );
      sendSuccess(res, 200, reportCard, 'Report card generated successfully');
    } catch (error) {
      next(error);
    }
  };
}