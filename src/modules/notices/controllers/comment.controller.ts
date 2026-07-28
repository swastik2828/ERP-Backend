import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

export class CommentController {
  constructor(private commentService: CommentService) {}

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId || !req.user.id) {
        throw new AppError('ERR_UNAUTHORIZED: Unauthorized', 401);
      }
      
      const comment = await this.commentService.addComment(
        req.user.schoolId as string, 
        req.params.id as string, 
        req.user.id as string, 
        req.body.content, 
        req.body.parentCommentId
      );
      
      sendSuccess(res, 201, comment, 'Comment added successfully');
    } catch (e) {
      next(e);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId || !req.user.id) {
        throw new AppError('ERR_UNAUTHORIZED: Unauthorized', 401);
      }
      
      await this.commentService.deleteComment(
        req.user.schoolId as string, 
        req.params.commentId as string, 
        req.user.id as string, 
        req.user.role as string
      );
      
      sendSuccess(res, 200, null, 'Comment deleted successfully');
    } catch (e) {
      next(e);
    }
  };
}