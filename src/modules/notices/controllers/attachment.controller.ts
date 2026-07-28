import { Request, Response, NextFunction } from 'express';
import { AttachmentService } from '../services/attachment.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

export class AttachmentController {
  constructor(private attachmentService: AttachmentService) {}

  private getRouteParam(param: string | string[] | undefined): string {
    if (typeof param === 'string') return param;
    return param?.[0] ?? '';
  }

  upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('ERR_UNAUTHORIZED: Unauthorized', 401);
      const file = req.file;
      if (!file) throw new AppError('ERR_VALIDATION_ERROR: No file provided', 400);

      const attachment = await this.attachmentService.uploadAttachment(
        req.user.schoolId,
        this.getRouteParam(req.params.id),
        req.user.id,
        file
      );

      sendSuccess(res, 201, attachment, 'Attachment uploaded successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId) throw new AppError('ERR_UNAUTHORIZED: Unauthorized', 401);

      await this.attachmentService.deleteAttachment(
        req.user.schoolId,
        this.getRouteParam(req.params.id),
        this.getRouteParam(req.params.attachmentId),
        req.user.id,
        req.user.role
      );

      sendSuccess(res, 200, null, 'Attachment deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}