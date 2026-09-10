/**
 * Admin Authentication Service.
 */

import { AuthSession } from '@vision-school/auth';
import { AppError } from '@vision-school/shared';

export class AuthService {
  async loginAdmin(email: string, password: string): Promise<AuthSession> {
    if (!email || !password) {
      throw AppError.badRequest('Email et mot de passe requis.');
    }

    // In full auth phase, verify hashed password with bcrypt / argon2.
    return {
      accessToken: 'jwt_mock_token_super_admin_2026',
      refreshToken: 'jwt_mock_refresh_token_2026',
      expiresInSeconds: 900,
      user: {
        id: 'usr_001',
        email: 'direction@visionschool.dz',
        firstName: 'Nadia',
        lastName: 'Bouzid',
        role: 'SUPER_ADMIN',
        allowedSchoolIds: [],
      },
    };
  }
}
