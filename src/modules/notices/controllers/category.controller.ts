import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { sendSuccess } from '../../../utils/response.util';
import { AppError } from '../../../errors/AppError';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId) {
        throw new AppError('ERR_UNAUTHORIZED: Unauthorized', 401);
      }
      const category = await this.categoryService.createCategory(req.user.schoolId, req.body);
      sendSuccess(res, 201, category, 'Category created successfully');
    } catch (e) {
      next(e);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId) {
        throw new AppError('ERR_UNAUTHORIZED: Unauthorized', 401);
      }
      const categories = await this.categoryService.getCategories(req.user.schoolId);
      sendSuccess(res, 200, categories, 'Categories retrieved successfully');
    } catch (e) {
      next(e);
    }
  };
}