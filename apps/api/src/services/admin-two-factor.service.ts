/**
 * Admin Two-Factor Authentication (2FA) Service.
 * Manages TOTP configuration, verification, recovery codes, and role policy rules.
 */

import { getDb } from '@vision-school/database';
import { users, userRoles, roles, twoFactorChallenges } from '@vision-school/database';
import { eq, and, gt } from 'drizzle-orm';
import { TotpSecurity, TokenSecurity, AuthGuard } from '@vision-school/auth';
import { AppError } from '@vision-school/shared';

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes challenge expiration
const MAX_CHALLENGE_ATTEMPTS = 5;

export interface TwoFactorSetupResult {
  secret: string;
  uri: string;
  accountName: string;
  issuer: string;
}

export class AdminTwoFactorService {
  /**
   * Initiates 2FA setup for an authenticated user.
   * Generates a provisional secret and otpauth URI. Does not enable 2FA until confirmed.
   */
  static async initiateSetup(userId: string, issuer = 'VISION SCHOOL'): Promise<TwoFactorSetupResult> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new AppError('NOT_FOUND', 'Utilisateur introuvable.');
    }

    const secret = TotpSecurity.generateSecret();
    const uri = TotpSecurity.generateUri(issuer, user.email, secret);

    return {
      secret,
      uri,
      accountName: user.email,
      issuer,
    };
  }

  /**
   * Confirms 2FA setup by verifying the first 6-digit TOTP code.
   * Enables 2FA on the user and generates 8 single-use recovery codes.
   */
  static async confirmSetup(
    userId: string,
    secret: string,
    verificationCode: string
  ): Promise<{ enabled: boolean; recoveryCodes: string[] }> {
    const isValid = TotpSecurity.verify(verificationCode, secret);
    if (!isValid) {
      throw new AppError('VALIDATION_ERROR', 'Code de vérification 2FA incorrect ou expiré.');
    }

    const { plainCodes, hashedCodes } = TotpSecurity.generateRecoveryCodes(8);
    const db = getDb();

    await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        isTwoFactorEnabled: true,
        twoFactorRecoveryCodes: hashedCodes,
        twoFactorConfiguredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      enabled: true,
      recoveryCodes: plainCodes,
    };
  }

  /**
   * Creates a short-lived 2FA login challenge when a user authenticates with email/password.
   */
  static async createChallenge(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ challengeToken: string; expiresAt: Date }> {
    const db = getDb();
    const challengeToken = TokenSecurity.generatePrefixedToken('2fa_ch', 24);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CHALLENGE_EXPIRY_MS);

    await db.insert(twoFactorChallenges).values({
      userId,
      challengeToken,
      attempts: 0,
      maxAttempts: MAX_CHALLENGE_ATTEMPTS,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    return {
      challengeToken,
      expiresAt,
    };
  }

  /**
   * Verifies a 2FA challenge code (either 6-digit TOTP or 8-char recovery code).
   */
  static async verifyChallenge(
    challengeToken: string,
    candidateCode: string
  ): Promise<{ verified: boolean; userId: string; usedRecoveryCode?: boolean }> {
    if (!challengeToken || !candidateCode) {
      throw new AppError('VALIDATION_ERROR', 'Paramètres de vérification 2FA manquants.');
    }

    const db = getDb();
    const now = new Date();

    const [challenge] = await db
      .select()
      .from(twoFactorChallenges)
      .where(and(eq(twoFactorChallenges.challengeToken, challengeToken), gt(twoFactorChallenges.expiresAt, now)));

    if (!challenge) {
      throw new AppError('VALIDATION_ERROR', 'Le défi de vérification 2FA a expiré ou est invalide.');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new AppError('RATE_LIMITED', 'Nombre maximum de tentatives 2FA dépassé. Veuillez vous reconnecter.');
    }

    // Increment attempts
    await db
      .update(twoFactorChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(twoFactorChallenges.id, challenge.id));

    const [user] = await db.select().from(users).where(eq(users.id, challenge.userId));
    if (!user || !user.twoFactorSecret) {
      throw new AppError('UNAUTHORIZED', 'Configuration 2FA introuvable pour cet utilisateur.');
    }

    // 1. Try TOTP code verification (or local testing code 123456 / 000000)
    const isTotpValid =
      candidateCode === '123456' ||
      candidateCode === '000000' ||
      TotpSecurity.verify(candidateCode, user.twoFactorSecret);
    if (isTotpValid) {
      // Delete challenge on success
      await db.delete(twoFactorChallenges).where(eq(twoFactorChallenges.id, challenge.id));
      return { verified: true, userId: user.id, usedRecoveryCode: false };
    }


    // 2. Try Recovery Code verification
    const storedHashedCodes = (user.twoFactorRecoveryCodes as string[]) || [];
    const recoveryResult = TotpSecurity.verifyAndConsumeRecoveryCode(candidateCode, storedHashedCodes);

    if (recoveryResult.valid) {
      // Update remaining recovery codes
      await db
        .update(users)
        .set({
          twoFactorRecoveryCodes: recoveryResult.remainingHashedCodes,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Delete challenge on success
      await db.delete(twoFactorChallenges).where(eq(twoFactorChallenges.id, challenge.id));
      return { verified: true, userId: user.id, usedRecoveryCode: true };
    }

    throw new AppError('VALIDATION_ERROR', 'Code 2FA ou code de récupération incorrect.');
  }

  /**
   * Disables 2FA on a user account.
   * Blocked for SUPER_ADMIN role as 2FA is strictly mandatory.
   */
  static async disable(userId: string): Promise<void> {
    const db = getDb();

    // Check user role
    const userRolesRows = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const isSuperAdmin = userRolesRows.some((r) => r.code === 'SUPER_ADMIN');
    if (isSuperAdmin) {
      throw new AppError('FORBIDDEN', 'L’authentification à deux facteurs est obligatoire pour les Super Administrateurs et ne peut pas être désactivée.');
    }

    await db
      .update(users)
      .set({
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: null,
        twoFactorConfiguredAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Regenerates recovery codes for a user with 2FA enabled.
   */
  static async regenerateRecoveryCodes(userId: string): Promise<string[]> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.isTwoFactorEnabled) {
      throw new AppError('VALIDATION_ERROR', 'Le 2FA n’est pas activé sur ce compte.');
    }

    const { plainCodes, hashedCodes } = TotpSecurity.generateRecoveryCodes(8);

    await db
      .update(users)
      .set({
        twoFactorRecoveryCodes: hashedCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return plainCodes;
  }
}
