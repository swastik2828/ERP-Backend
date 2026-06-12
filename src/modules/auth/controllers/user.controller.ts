import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../../../utils/response.util';

const userService = new UserService();

export class UserController {
  // Arrow function binds 'this' automatically, useful for Express route handlers
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // FIXED: Use .id instead of .sub based on AuthUserContext
      const creatorId = req.user!.id; 
      const creatorRole = req.user!.role;
      const creatorSchoolId = req.user!.schoolId;
      const ipAddress = req.ip;

      const result = await userService.provisionUser(
        req.body, 
        creatorId, 
        creatorRole, 
        creatorSchoolId, 
        ipAddress
      );

      // FIXED: Swapped 'result' and 'message' to match sendSuccess signature
      sendSuccess(res, 201, result, 'User provisioned successfully');
    } catch (error) {
      next(error);
    }
  };
}