import { Request, Response, NextFunction } from 'express';
import { TimetableService } from '../services/timetable.service';
import { sendSuccess } from '../../../utils/response.util';

export class TimetableController {
  
  static async createDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user!.schoolId!;
      const timetable = await TimetableService.createDraftTimetable(schoolId, req.body);
      
      return sendSuccess(res, 201, timetable, 'Draft timetable created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const timetable = await TimetableService.getTimetableDetails(id);
      
      return sendSuccess(res, 200, timetable, 'Timetable fetched successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const timetable = await TimetableService.publishTimetable(id, userId);
      
      return sendSuccess(res, 200, timetable, 'Timetable published successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async addSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const slot = await TimetableService.addSlot(req.body);
      
      return sendSuccess(res, 201, slot, 'Slot added successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async copy(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user!.schoolId!;
      const id = req.params.id as string;
      const newTimetable = await TimetableService.copyTimetable(id, schoolId, req.body);
      
      return sendSuccess(res, 201, newTimetable, 'Timetable copied successfully');
    } catch (error) {
      return next(error);
    }
  }
}