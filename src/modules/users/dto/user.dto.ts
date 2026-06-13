import { z } from 'zod';
import { createUserSchema, updateUserSchema, queryUsersSchema } from '../validators/user.validator';

export type CreateUserDto = z.infer<typeof createUserSchema>['body'];
export type UpdateUserDto = z.infer<typeof updateUserSchema>['body'];
export type QueryUsersDto = z.infer<typeof queryUsersSchema>['query'];