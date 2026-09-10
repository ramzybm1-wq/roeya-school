/**
 * Auth provider contracts and token payload interfaces.
 */

import { UserRole } from '@vision-school/shared';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  allowedSchoolIds: string[];
  iat?: number;
  exp?: number;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    allowedSchoolIds: string[];
  };
}

export interface IAuthProvider {
  verifyToken(token: string): Promise<AuthTokenPayload>;
  generateSession(payload: AuthTokenPayload): Promise<AuthSession>;
}
