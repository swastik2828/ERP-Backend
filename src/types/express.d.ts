import { AuthUserContext } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserContext;
      file?: Multer.File;
      files?: Multer.File[] | Record<string, Multer.File[]>;
    }

    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
        destination?: string;
        filename?: string;
        path?: string;
        stream?: unknown;
      }
    }
  }
}

export {};