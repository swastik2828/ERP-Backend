import { AuthUserContext } from './auth.types';

declare global {
  namespace Express {
    export interface Request {
      user?: AuthUserContext;
    }
  }
}

export {};