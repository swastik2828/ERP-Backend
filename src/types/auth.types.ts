import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  schoolId: string | null;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
}

export interface AuthUserContext {
  id: string;
  email: string;
  role: Role;
  schoolId: string | null;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}