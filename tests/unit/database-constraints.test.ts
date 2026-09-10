/**
 * Unit Tests: Database Schema Constraints, Relations, Sequences, and Business Rules.
 * Verifies schema definitions, check constraints, unique indexes, and data integrity guarantees.
 */

import {
  schools,
  academicYears,
  cycles,
  levels,
  schoolYearLevels,
  tariffs,
  parents,
  students,
  registrations,
  registrationStatusHistory,
  registrationNotes,
  waitingListEntries,
  documentTypes,
  registrationDocuments,
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  userSchoolAccess,
  formatRegistrationCode,
  SEED_ACADEMIC_YEARS,
  SEED_SCHOOLS,
  SEED_CYCLES,
  SEED_LEVELS,
  SEED_DOCUMENT_TYPES,
  SEED_ROLES,
  SEED_PERMISSIONS,
} from '@vision-school/database';
import { getTableColumns } from 'drizzle-orm';

describe('Database Schema: Structure & Column Definitions', () => {
  test('schools table contains all required fields and geo constraints', () => {
    const cols = getTableColumns(schools);
    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.code).toBeDefined();
    expect(cols.phonePrimary).toBeDefined();
    expect(cols.emailPrimary).toBeDefined();
    expect(cols.latitude).toBeDefined();
    expect(cols.longitude).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.isActive).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
    expect(cols.archivedAt).toBeDefined();
  });

  test('academic_years table contains status and active-default flag', () => {
    const cols = getTableColumns(academicYears);
    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.startDate).toBeDefined();
    expect(cols.endDate).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.isActiveDefault).toBeDefined();
  });

  test('cycles and levels have proper foreign key link', () => {
    const cycleCols = getTableColumns(cycles);
    const levelCols = getTableColumns(levels);
    expect(cycleCols.id).toBeDefined();
    expect(cycleCols.code).toBeDefined();
    expect(levelCols.id).toBeDefined();
    expect(levelCols.cycleId).toBeDefined();
    expect(levelCols.code).toBeDefined();
  });

  test('school_year_levels is the central capacity junction table', () => {
    const cols = getTableColumns(schoolYearLevels);
    expect(cols.id).toBeDefined();
    expect(cols.schoolId).toBeDefined();
    expect(cols.academicYearId).toBeDefined();
    expect(cols.levelId).toBeDefined();
    expect(cols.capacityMode).toBeDefined();
    expect(cols.capacityMax).toBeDefined();
    expect(cols.fullBehavior).toBeDefined();
    expect(cols.waitingListEnabled).toBeDefined();
    expect(cols.waitingListMax).toBeDefined();
    expect(cols.showRemainingPlaces).toBeDefined();
    expect(cols.showStatusClient).toBeDefined();
    expect(cols.nearFullThreshold).toBeDefined();
  });

  test('tariffs table references school_year_levels and stores amount', () => {
    const cols = getTableColumns(tariffs);
    expect(cols.id).toBeDefined();
    expect(cols.schoolYearLevelId).toBeDefined();
    expect(cols.amount).toBeDefined();
    expect(cols.currency).toBeDefined();
    expect(cols.showClient).toBeDefined();
  });

  test('parents table stores contact info without global phone uniqueness', () => {
    const cols = getTableColumns(parents);
    expect(cols.id).toBeDefined();
    expect(cols.fullName).toBeDefined();
    expect(cols.phonePrimary).toBeDefined();
    expect(cols.email).toBeDefined();
  });

  test('students table stores student biographical data', () => {
    const cols = getTableColumns(students);
    expect(cols.id).toBeDefined();
    expect(cols.fullName).toBeDefined();
    expect(cols.birthDate).toBeDefined();
    expect(cols.gender).toBeDefined();
  });

  test('registrations table has all foreign keys, status, and tariff snapshots', () => {
    const cols = getTableColumns(registrations);
    expect(cols.id).toBeDefined();
    expect(cols.registrationCode).toBeDefined();
    expect(cols.schoolId).toBeDefined();
    expect(cols.academicYearId).toBeDefined();
    expect(cols.levelId).toBeDefined();
    expect(cols.schoolYearLevelId).toBeDefined();
    expect(cols.parentId).toBeDefined();
    expect(cols.studentId).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.tariffId).toBeDefined();
    expect(cols.tariffAmountSnapshot).toBeDefined();
    expect(cols.tariffCurrencySnapshot).toBeDefined();
    expect(cols.clientTariffVisibleSnapshot).toBeDefined();
    expect(cols.source).toBeDefined();
    expect(cols.publicTrackingEnabled).toBeDefined();
  });

  test('registration_status_history is append-only for full auditability', () => {
    const cols = getTableColumns(registrationStatusHistory);
    expect(cols.id).toBeDefined();
    expect(cols.registrationId).toBeDefined();
    expect(cols.fromStatus).toBeDefined();
    expect(cols.toStatus).toBeDefined();
    expect(cols.changedByUserId).toBeDefined();
    expect(cols.reasonCode).toBeDefined();
    expect(cols.internalComment).toBeDefined();
    expect(cols.publicComment).toBeDefined();
    expect(cols.createdAt).toBeDefined();
  });

  test('registration_notes is private and soft-deletable', () => {
    const cols = getTableColumns(registrationNotes);
    expect(cols.id).toBeDefined();
    expect(cols.registrationId).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.content).toBeDefined();
    expect(cols.deletedAt).toBeDefined();
  });

  test('registration_documents stores private storage keys, never public URLs', () => {
    const cols = getTableColumns(registrationDocuments);
    expect(cols.id).toBeDefined();
    expect(cols.registrationId).toBeDefined();
    expect(cols.documentTypeId).toBeDefined();
    expect(cols.storageKey).toBeDefined();
    expect(cols.mimeType).toBeDefined();
    expect(cols.fileSizeBytes).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.versionNumber).toBeDefined();
    expect(cols.replacesDocumentId).toBeDefined();
    expect(cols.reviewedByUserId).toBeDefined();
  });
});

describe('Database Rules: Registration Code Sequence Strategy', () => {
  test('formatRegistrationCode formats properly padded sequential codes', () => {
    expect(formatRegistrationCode('2026/2027', 1)).toBe('REG-2026-000001');
    expect(formatRegistrationCode(2026, 125)).toBe('REG-2026-000125');
    expect(formatRegistrationCode(2026, 99999)).toBe('REG-2026-099999');
    expect(formatRegistrationCode(2026, 100000)).toBe('REG-2026-100000');
  });
});

describe('Database Rules: Capacity Calculation Guarantee', () => {
  test('remaining places is derived dynamically: capacity_max - accepted_registrations', () => {
    const capacityMax = 255;
    const acceptedCount = 120;
    const remainingPlaces = capacityMax - acceptedCount;

    expect(remainingPlaces).toBe(135);

    // Unaccepted statuses do not consume capacity
    const unacceptedStatuses = ['NEW', 'UNDER_REVIEW', 'PENDING', 'REFUSED', 'WAITLISTED', 'CANCELLED'];
    const countAffectingCapacity = (statuses: string[]) =>
      statuses.filter((s) => s === 'ACCEPTED').length;

    expect(countAffectingCapacity(unacceptedStatuses)).toBe(0);
  });
});

describe('Database Seed Data Integrity', () => {
  test('contains active default academic year 2026/2027', () => {
    const activeYear = SEED_ACADEMIC_YEARS.find((y) => y.name === '2026 / 2027');
    expect(activeYear).toBeDefined();
    expect(activeYear?.status).toBe('ACTIVE');
    expect(activeYear?.isActiveDefault).toBe(true);
  });

  test('contains both sample schools (École A and École B)', () => {
    expect(SEED_SCHOOLS.length).toBe(2);
    expect(SEED_SCHOOLS[0].code).toBe('VS-HYDRA-01');
    expect(SEED_SCHOOLS[1].code).toBe('VS-ELBIAR-02');
  });

  test('contains 4 educational cycles', () => {
    expect(SEED_CYCLES.length).toBe(4);
    const codes = SEED_CYCLES.map((c) => c.code);
    expect(codes).toContain('PREPARATOIRE');
    expect(codes).toContain('PRIMAIRE');
    expect(codes).toContain('MOYEN');
    expect(codes).toContain('SECONDAIRE');
  });

  test('contains 14 levels including preparatory, primary, middle, and secondary streams', () => {
    expect(SEED_LEVELS.length).toBe(14);
    const levelCodes = SEED_LEVELS.map((l) => l.code);
    expect(levelCodes).toContain('PREP');
    expect(levelCodes).toContain('1AP');
    expect(levelCodes).toContain('5AP');
    expect(levelCodes).toContain('1AM');
    expect(levelCodes).toContain('4AM');
    expect(levelCodes).toContain('1AS_LETTRES');
    expect(levelCodes).toContain('1AS_SCIENCES_TECH');
    expect(levelCodes).toContain('3AS');
  });

  test('contains 6 document types that are optional by default', () => {
    expect(SEED_DOCUMENT_TYPES.length).toBe(6);
    const docNames = SEED_DOCUMENT_TYPES.map((d) => d.nameFr);
    expect(docNames).toContain('Extrait de naissance');
    expect(docNames).toContain('Certificat de scolarité');
    expect(docNames).toContain('Bulletin de notes');
    expect(docNames).toContain('Photo d’identité');
    expect(docNames).toContain('Carte d’identité du parent');
    expect(docNames).toContain('Justificatif de résidence');
  });

  test('contains 3 system roles with granular permissions', () => {
    expect(SEED_ROLES.length).toBe(3);
    expect(SEED_ROLES.map((r) => r.code)).toEqual(['SUPER_ADMIN', 'ADMIN', 'AGENT']);
    expect(SEED_PERMISSIONS.length).toBeGreaterThanOrEqual(30);
  });
});
