import bcrypt from 'bcrypt';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};