/**
 * Seeder engine for VISION SCHOOL database.
 * Seeds all initial reference data and test administrator accounts in dependency order:
 * 1. Academic Years
 * 2. Schools
 * 3. Cycles & Levels
 * 4. School Year Levels (Capacities)
 * 5. Document Types
 * 6. Roles, Permissions & Role-Permission mappings
 * 7. Test Admin Users & School Access
 * 8. System Settings
 */

import { getDb, VisionSchoolDb } from '../client';
import {
  academicYears,
  schools,
  cycles,
  levels,
  schoolYearLevels,
  documentTypes,
  roles,
  permissions,
  rolePermissions,
  users,
  userRoles,
  userSchoolAccess,
  systemSettings,
} from '../schema';
import {
  SEED_ACADEMIC_YEARS,
  SEED_SCHOOLS,
  SEED_CYCLES,
  SEED_LEVELS,
  SEED_SCHOOL_YEAR_LEVELS,
  SEED_DOCUMENT_TYPES,
  SEED_ROLES,
  SEED_PERMISSIONS,
  SEED_USERS,
  SEED_SYSTEM_SETTINGS,
} from './seed-data';
import { pbkdf2, randomBytes } from 'crypto';

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`pbkdf2_sha512$100000$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

export class Seeder {
  /**
   * Runs the complete seeding pipeline.
   */
  static async seedAll(db: VisionSchoolDb = getDb()): Promise<void> {
    console.log('🌱 Starting VISION SCHOOL database seeding...');

    // 1. Academic Years
    console.log('  -> Seeding academic years...');
    for (const year of SEED_ACADEMIC_YEARS) {
      await db.insert(academicYears).values(year).onConflictDoNothing();
    }

    // 2. Schools
    console.log('  -> Seeding schools...');
    for (const school of SEED_SCHOOLS) {
      await db.insert(schools).values(school).onConflictDoNothing();
    }

    // 3. Cycles
    console.log('  -> Seeding educational cycles...');
    for (const cycle of SEED_CYCLES) {
      await db.insert(cycles).values(cycle).onConflictDoNothing();
    }

    // 4. Levels
    console.log('  -> Seeding grade levels...');
    for (const level of SEED_LEVELS) {
      await db.insert(levels).values(level).onConflictDoNothing();
    }

    // 5. School Year Levels (Capacities)
    console.log('  -> Seeding school year levels...');
    for (const syl of SEED_SCHOOL_YEAR_LEVELS) {
      await db.insert(schoolYearLevels).values(syl).onConflictDoNothing();
    }

    // 6. Document Types
    console.log('  -> Seeding document types...');
    for (const doc of SEED_DOCUMENT_TYPES) {
      await db.insert(documentTypes).values(doc).onConflictDoNothing();
    }

    // 7. Roles
    console.log('  -> Seeding roles...');
    for (const role of SEED_ROLES) {
      await db.insert(roles).values(role).onConflictDoNothing();
    }

    // 8. Permissions
    console.log('  -> Seeding permissions...');
    for (const perm of SEED_PERMISSIONS) {
      await db.insert(permissions).values(perm).onConflictDoNothing();
    }

    // 9. Role-Permission mappings
    console.log('  -> Seeding role-permission mappings...');
    const superAdminRole = SEED_ROLES.find((r) => r.code === 'SUPER_ADMIN')!;
    const adminRole = SEED_ROLES.find((r) => r.code === 'ADMIN')!;
    const agentRole = SEED_ROLES.find((r) => r.code === 'AGENT')!;

    // SUPER_ADMIN gets all permissions
    for (const perm of SEED_PERMISSIONS) {
      await db
        .insert(rolePermissions)
        .values({ roleId: superAdminRole.id!, permissionId: perm.id! })
        .onConflictDoNothing();
    }

    // ADMIN gets operational permissions
    const adminRestrictedCodes = ['security.manage', 'settings.manage', 'role.manage', 'user.manage'];
    for (const perm of SEED_PERMISSIONS.filter((p) => !adminRestrictedCodes.includes(p.code))) {
      await db
        .insert(rolePermissions)
        .values({ roleId: adminRole.id!, permissionId: perm.id! })
        .onConflictDoNothing();
    }

    // AGENT gets limited front-office permissions
    const agentAllowedCodes = [
      'dashboard.read',
      'registration.read',
      'registration.update',
      'document.read',
      'document.validate',
      'school.read',
      'media.read',
      'capacity.read',
      'tariff.read',
      'report.read',
    ];
    for (const perm of SEED_PERMISSIONS.filter((p) => agentAllowedCodes.includes(p.code))) {
      await db
        .insert(rolePermissions)
        .values({ roleId: agentRole.id!, permissionId: perm.id! })
        .onConflictDoNothing();
    }

    // 10. Seed Admin Users & School Access
    console.log('  -> Seeding admin staff accounts...');
    const hydraSchoolId = 'b0000000-0000-0000-0000-000000000001';
    const elBiarSchoolId = 'b0000000-0000-0000-0000-000000000002';

    const dynamicHash = await hashPassword('Password123!');
    for (const user of SEED_USERS) {
      await db.insert(users).values({ ...user, passwordHash: dynamicHash }).onConflictDoNothing();
    }

    // Super Admin User Role (Global access)
    await db
      .insert(userRoles)
      .values({ userId: '40000000-0000-0000-0000-000000000001', roleId: superAdminRole.id! })
      .onConflictDoNothing();

    // Admin École A User Role + Hydra Access
    await db
      .insert(userRoles)
      .values({ userId: '40000000-0000-0000-0000-000000000002', roleId: adminRole.id! })
      .onConflictDoNothing();
    await db
      .insert(userSchoolAccess)
      .values({ userId: '40000000-0000-0000-0000-000000000002', schoolId: hydraSchoolId })
      .onConflictDoNothing();

    // Agent École A User Role + Hydra Access
    await db
      .insert(userRoles)
      .values({ userId: '40000000-0000-0000-0000-000000000003', roleId: agentRole.id! })
      .onConflictDoNothing();
    await db
      .insert(userSchoolAccess)
      .values({ userId: '40000000-0000-0000-0000-000000000003', schoolId: hydraSchoolId })
      .onConflictDoNothing();

    // Agent École B User Role + El Biar Access
    await db
      .insert(userRoles)
      .values({ userId: '40000000-0000-0000-0000-000000000004', roleId: agentRole.id! })
      .onConflictDoNothing();
    await db
      .insert(userSchoolAccess)
      .values({ userId: '40000000-0000-0000-0000-000000000004', schoolId: elBiarSchoolId })
      .onConflictDoNothing();

    // 11. System Settings
    console.log('  -> Seeding system settings...');
    for (const setting of SEED_SYSTEM_SETTINGS) {
      await db.insert(systemSettings).values(setting).onConflictDoNothing();
    }

    console.log('✅ VISION SCHOOL database seeding completed successfully.');
  }
}
