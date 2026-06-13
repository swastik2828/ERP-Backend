import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../../../utils/response.util';

export class UserController {
  constructor(private readonly userService: UserService) {}

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const creatorId = req.user!.id; 
      const creatorRole = req.user!.role;
      const creatorSchoolId = req.user!.schoolId;
      // req.ip can also be string | undefined, so we default to a string if undefined
      const ipAddress = req.ip as string | undefined;

      const result = await this.userService.provisionUser(
        req.body, creatorId, creatorRole, creatorSchoolId, ipAddress
      );

      sendSuccess(res, 201, result, 'User provisioned successfully');
    } catch (error) {
      next(error);
    }
  };

  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.userService.listUsers(req.user!.schoolId, req.query as any);
      
      sendSuccess(res, 200, result.data, 'Users retrieved', { total: result.total });
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // FIXED: Explicitly cast req.params.id to string to satisfy Express 5's strict types
      const userId = req.params.id as string;
      const schoolId = req.user!.role === 'SUPER_ADMIN' ? null : req.user!.schoolId;

      const result = await this.userService.updateUser(userId, schoolId, req.body);
      sendSuccess(res, 200, { id: result.id }, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  };
}