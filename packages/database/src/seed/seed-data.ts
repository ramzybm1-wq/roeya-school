/**
 * Platform initial seed data for VISION SCHOOL.
 *
 * Covers:
 * - Academic Year: 2026 / 2027 (ACTIVE, default) & 2025 / 2026 (ARCHIVED)
 * - Establishments: 2 sample schools (Campus Hydra / École A & Campus El Biar / École B)
 * - 4 Educational Cycles (Préparatoire, Primaire, Moyen, Secondaire)
 * - 14 Standard Levels including 1AS Lettres & 1AS Sciences & Technologie
 * - School-Year-Level Configurations (including École A 1AP capacity 255)
 * - 6 Document Types (all OPTIONAL by default)
 * - 3 Roles (SUPER_ADMIN, ADMIN, AGENT) + 31 Granular Permissions + Mappings
 * - Test Admin Accounts (Super Admin, Hydra Admin, Hydra Agent, El Biar Agent)
 * - System Settings
 */

import {
  academicYears,
  schools,
  cycles,
  levels,
  documentTypes,
  roles,
  permissions,
  systemSettings,
  users,
} from '../schema';

export type DbInsertAcademicYear = typeof academicYears.$inferInsert;
export type DbInsertSchool = typeof schools.$inferInsert;
export type DbInsertCycle = typeof cycles.$inferInsert;
export type DbInsertLevel = typeof levels.$inferInsert;
export type DbInsertDocumentType = typeof documentTypes.$inferInsert;
export type DbInsertRole = typeof roles.$inferInsert;
export type DbInsertPermission = typeof permissions.$inferInsert;
export type DbInsertSystemSetting = typeof systemSettings.$inferInsert;
export type DbInsertUser = typeof users.$inferInsert;

// ─── 1. Academic Years ────────────────────────────────────────────────────────
export const SEED_ACADEMIC_YEARS: DbInsertAcademicYear[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: '2026 / 2027',
    startDate: '2026-09-01',
    endDate: '2027-06-30',
    status: 'ACTIVE',
    isActiveDefault: true,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: '2025 / 2026',
    startDate: '2025-09-01',
    endDate: '2026-06-30',
    status: 'ARCHIVED',
    isActiveDefault: false,
  },
];

// ─── 2. Schools ───────────────────────────────────────────────────────────────
export const SEED_SCHOOLS: DbInsertSchool[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'VISION SCHOOL - École A (Campus Hydra)',
    shortName: 'École A (Hydra)',
    code: 'VS-HYDRA-01',
    description: "Campus principal d'excellence éducative, accueillant les cycles Préparatoire, Primaire et Moyen dans un cadre moderne et sécurisé.",
    phonePrimary: '023 48 12 34',
    phoneSecondary: '0560 12 34 56',
    whatsapp: '+213560123456',
    emailPrimary: 'hydra@visionschool.dz',
    emailSecondary: 'direction.hydra@visionschool.dz',
    website: 'https://hydra.visionschool.dz',
    address: '14, Rue des Pins, Hydra',
    wilaya: 'Alger',
    commune: 'Hydra',
    postalCode: '16035',
    country: 'Algérie',
    latitude: 36.7456,
    longitude: 3.0278,
    googleMapsUrl: 'https://maps.google.com/?q=36.7456,3.0278',
    status: 'ACTIVE',
    isActive: true,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'VISION SCHOOL - École B (Campus El Biar)',
    shortName: 'École B (El Biar)',
    code: 'VS-ELBIAR-02',
    description: 'Campus d’excellence bilingue accueillant les cycles Moyen et Secondaire avec infrastructures sportives et laboratoires scientifiques.',
    phonePrimary: '023 79 56 78',
    phoneSecondary: '0560 78 90 12',
    whatsapp: '+213560789012',
    emailPrimary: 'elbiar@visionschool.dz',
    emailSecondary: 'direction.elbiar@visionschool.dz',
    website: 'https://elbiar.visionschool.dz',
    address: '28, Avenue Ali Khodja, El Biar',
    wilaya: 'Alger',
    commune: 'El Biar',
    postalCode: '16030',
    country: 'Algérie',
    latitude: 36.7689,
    longitude: 3.0321,
    googleMapsUrl: 'https://maps.google.com/?q=36.7689,3.0321',
    status: 'ACTIVE',
    isActive: true,
  },
];

// ─── 3. Cycles ────────────────────────────────────────────────────────────────
export const SEED_CYCLES: DbInsertCycle[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    code: 'PREPARATOIRE',
    nameFr: 'Préparatoire (Maternelle)',
    nameAr: 'الطور التحضيري (الروضة)',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    code: 'PRIMAIRE',
    nameFr: 'Primaire',
    nameAr: 'الطور الابتدائي',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    code: 'MOYEN',
    nameFr: 'Moyen (Collège)',
    nameAr: 'الطور المتوسط',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    code: 'SECONDAIRE',
    nameFr: 'Secondaire (Lycée)',
    nameAr: 'الطور الثانوي',
    displayOrder: 4,
    isActive: true,
  },
];

// ─── 4. Levels ────────────────────────────────────────────────────────────────
const CYCLE_PREP = 'c0000000-0000-0000-0000-000000000001';
const CYCLE_PRIM = 'c0000000-0000-0000-0000-000000000002';
const CYCLE_MOY = 'c0000000-0000-0000-0000-000000000003';
const CYCLE_SEC = 'c0000000-0000-0000-0000-000000000004';

export const SEED_LEVELS: DbInsertLevel[] = [
  // Préparatoire
  { id: 'd0000000-0000-0000-0000-000000000001', cycleId: CYCLE_PREP, code: 'PREP', nameFr: 'Section Préparatoire', nameAr: 'القسم التحضيري', displayOrder: 1, isActive: true },

  // Primaire (1AP to 5AP)
  { id: 'd0000000-0000-0000-0000-000000000002', cycleId: CYCLE_PRIM, code: '1AP', nameFr: '1ère Année Primaire (1AP)', nameAr: 'السنة الأولى ابتدائي', displayOrder: 2, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000003', cycleId: CYCLE_PRIM, code: '2AP', nameFr: '2ème Année Primaire (2AP)', nameAr: 'السنة الثانية ابتدائي', displayOrder: 3, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000004', cycleId: CYCLE_PRIM, code: '3AP', nameFr: '3ème Année Primaire (3AP)', nameAr: 'السنة الثالثة ابتدائي', displayOrder: 4, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000005', cycleId: CYCLE_PRIM, code: '4AP', nameFr: '4ème Année Primaire (4AP)', nameAr: 'السنة الرابعة ابتدائي', displayOrder: 5, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000006', cycleId: CYCLE_PRIM, code: '5AP', nameFr: '5ème Année Primaire (5AP)', nameAr: 'السنة الخامسة ابتدائي', displayOrder: 6, isActive: true },

  // Moyen (1AM to 4AM)
  { id: 'd0000000-0000-0000-0000-000000000007', cycleId: CYCLE_MOY, code: '1AM', nameFr: '1ère Année Moyenne (1AM)', nameAr: 'السنة الأولى متوسط', displayOrder: 7, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000008', cycleId: CYCLE_MOY, code: '2AM', nameFr: '2ème Année Moyenne (2AM)', nameAr: 'السنة الثانية متوسط', displayOrder: 8, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000009', cycleId: CYCLE_MOY, code: '3AM', nameFr: '3ème Année Moyenne (3AM)', nameAr: 'السنة الثالثة متوسط', displayOrder: 9, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000010', cycleId: CYCLE_MOY, code: '4AM', nameFr: '4ème Année Moyenne (4AM - BEM)', nameAr: 'السنة الرابعة متوسط', displayOrder: 10, isActive: true },

  // Secondaire (1AS Lettres, 1AS Sciences & Tech, 2AS, 3AS)
  { id: 'd0000000-0000-0000-0000-000000000011', cycleId: CYCLE_SEC, code: '1AS_LETTRES', nameFr: '1ère Année Secondaire - Lettres (1AS)', nameAr: 'السنة الأولى ثانوي - آداب', displayOrder: 11, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000012', cycleId: CYCLE_SEC, code: '1AS_SCIENCES_TECH', nameFr: '1ère Année Secondaire - Sciences & Tech (1AS)', nameAr: 'السنة الأولى ثانوي - علوم وتكنولوجيا', displayOrder: 12, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000013', cycleId: CYCLE_SEC, code: '2AS', nameFr: '2ème Année Secondaire (2AS)', nameAr: 'السنة الثانية ثانوي', displayOrder: 13, isActive: true },
  { id: 'd0000000-0000-0000-0000-000000000014', cycleId: CYCLE_SEC, code: '3AS', nameFr: '3ème Année Secondaire (3AS - BAC)', nameAr: 'السنة الثالثة ثانوي', displayOrder: 14, isActive: true },
];

// ─── 5. Example School Year Levels (Capacity) ─────────────────────────────────
export const SEED_SCHOOL_YEAR_LEVELS = [
  // École A, 2026/2027, 1AP with capacity 255
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    schoolId: 'b0000000-0000-0000-0000-000000000001', // École A
    academicYearId: 'a0000000-0000-0000-0000-000000000001', // 2026/2027
    levelId: 'd0000000-0000-0000-0000-000000000002', // 1AP
    isVisibleClient: true,
    registrationStatus: 'NEW' as const,
    registrationOpen: true,
    capacityMode: 'LIMITED' as const,
    capacityMax: 255,
    fullBehavior: 'WAITLIST' as const,
    waitingListEnabled: true,
    waitingListMax: 50,
    showRemainingPlaces: false,
    showStatusClient: true,
    showFillRate: false,
    nearFullThreshold: 85,
    displayOrder: 1,
  },
  // École A, 2026/2027, PREP with capacity 120
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    schoolId: 'b0000000-0000-0000-0000-000000000001', // École A
    academicYearId: 'a0000000-0000-0000-0000-000000000001', // 2026/2027
    levelId: 'd0000000-0000-0000-0000-000000000001', // PREP
    isVisibleClient: true,
    registrationStatus: 'NEW' as const,
    registrationOpen: true,
    capacityMode: 'LIMITED' as const,
    capacityMax: 120,
    fullBehavior: 'WAITLIST' as const,
    waitingListEnabled: true,
    waitingListMax: 30,
    showRemainingPlaces: false,
    showStatusClient: true,
    showFillRate: false,
    nearFullThreshold: 85,
    displayOrder: 2,
  },
  // École B, 2026/2027, 1AM with capacity 180
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    schoolId: 'b0000000-0000-0000-0000-000000000002', // École B
    academicYearId: 'a0000000-0000-0000-0000-000000000001', // 2026/2027
    levelId: 'd0000000-0000-0000-0000-000000000007', // 1AM
    isVisibleClient: true,
    registrationStatus: 'NEW' as const,
    registrationOpen: true,
    capacityMode: 'LIMITED' as const,
    capacityMax: 180,
    fullBehavior: 'WAITLIST' as const,
    waitingListEnabled: true,
    waitingListMax: 40,
    showRemainingPlaces: false,
    showStatusClient: true,
    showFillRate: false,
    nearFullThreshold: 85,
    displayOrder: 1,
  },
];

// ─── 6. Document Types (All OPTIONAL by default) ──────────────────────────────
export const SEED_DOCUMENT_TYPES: DbInsertDocumentType[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    nameFr: 'Extrait de naissance',
    nameAr: 'شهادة ميلاد التلميذ (عقد 12)',
    descriptionFr: 'Extrait de naissance récent (moins de 3 mois) de l’élève.',
    descriptionAr: 'شهادة ميلاد حديثة (أقل من 3 أشهر).',
    fileRuleType: 'IMAGE_OR_PDF',
    maxFileSizeBytes: 5 * 1024 * 1024,
    maxFiles: 1,
    isActive: true,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    nameFr: 'Certificat de scolarité',
    nameAr: 'شهادة مدرسية / شهادة شطب',
    descriptionFr: 'Certificat de scolarité ou radiation de l’établissement précédent pour les transferts.',
    descriptionAr: 'شهادة مدرسية من المؤسسة السابقة في حالة التحويل.',
    fileRuleType: 'IMAGE_OR_PDF',
    maxFileSizeBytes: 5 * 1024 * 1024,
    maxFiles: 1,
    isActive: true,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    nameFr: 'Bulletin de notes',
    nameAr: 'كشف النقاط للسنة السابقة',
    descriptionFr: 'Bulletins scolaires des 3 trimestres de l’année écoulée.',
    descriptionAr: 'كشوف النقاط للفصول الثلاثة للسنة الماضية.',
    fileRuleType: 'IMAGE_OR_PDF',
    maxFileSizeBytes: 10 * 1024 * 1024,
    maxFiles: 3,
    isActive: true,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000004',
    nameFr: 'Photo d’identité',
    nameAr: 'صورة شمسية',
    descriptionFr: 'Photo d’identité récente sur fond blanc.',
    descriptionAr: 'صورة شمسية حديثة بخلفية بيضاء.',
    fileRuleType: 'IMAGE',
    maxFileSizeBytes: 2 * 1024 * 1024,
    maxFiles: 1,
    isActive: true,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000005',
    nameFr: 'Carte d’identité du parent',
    nameAr: 'بطاقة تعريف الولي / الوصي الشرعي',
    descriptionFr: 'CNI biométrique ou Passeport du parent ou tuteur légal.',
    descriptionAr: 'بطاقة التعريف الوطنية البيومترية أو جواز السفر.',
    fileRuleType: 'IMAGE_OR_PDF',
    maxFileSizeBytes: 5 * 1024 * 1024,
    maxFiles: 2,
    isActive: true,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000006',
    nameFr: 'Justificatif de résidence',
    nameAr: 'شهادة إقامة',
    descriptionFr: 'Certificat de résidence ou facture Sonelgaz récente.',
    descriptionAr: 'شهادة إقامة أو فاتورة حديثة.',
    fileRuleType: 'IMAGE_OR_PDF',
    maxFileSizeBytes: 5 * 1024 * 1024,
    maxFiles: 1,
    isActive: true,
  },
];

// ─── 7. Roles ─────────────────────────────────────────────────────────────────
export const SEED_ROLES: DbInsertRole[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    code: 'SUPER_ADMIN',
    name: 'Super Administrateur',
    description: 'Accès global absolu à tous les établissements, paramètres système, gestion des utilisateurs et sécurité.',
    isSystemRole: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'Administrateur d’Établissement',
    code: 'ADMIN',
    description: 'Gestion complète des inscriptions, capacités, tarifs, documents et rapports sur son établissement assigné.',
    isSystemRole: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    code: 'AGENT',
    name: 'Agent de Scolarité / Réception',
    description: 'Consultation et traitement opérationnel des dossiers d’inscription, vérification des pièces justificatives.',
    isSystemRole: true,
  },
];

// ─── 8. Permissions ───────────────────────────────────────────────────────────
export const SEED_PERMISSIONS: DbInsertPermission[] = [
  { id: '20000000-0000-0000-0000-000000000001', code: 'dashboard.read', description: 'Accéder au tableau de bord' },
  { id: '20000000-0000-0000-0000-000000000002', code: 'registration.read', description: 'Consulter les dossiers d’inscription' },
  { id: '20000000-0000-0000-0000-000000000003', code: 'registration.create', description: 'Créer manuellement un dossier' },
  { id: '20000000-0000-0000-0000-000000000004', code: 'registration.update', description: 'Modifier les informations d’un dossier' },
  { id: '20000000-0000-0000-0000-000000000005', code: 'registration.accept', description: 'Accepter définitivement un dossier' },
  { id: '20000000-0000-0000-0000-000000000006', code: 'registration.refuse', description: 'Refuser un dossier d’inscription' },
  { id: '20000000-0000-0000-0000-000000000007', code: 'registration.cancel', description: 'Annuler un dossier d’inscription' },
  { id: '20000000-0000-0000-0000-000000000008', code: 'waitinglist.manage', description: 'Gérer la liste d’attente et promotions' },
  { id: '20000000-0000-0000-0000-000000000009', code: 'capacity.read', description: 'Consulter les capacités par niveau' },
  { id: '20000000-0000-0000-0000-000000000010', code: 'capacity.manage', description: 'Modifier les quotas de places' },
  { id: '20000000-0000-0000-0000-000000000011', code: 'tariff.read', description: 'Consulter les grilles tarifaires' },
  { id: '20000000-0000-0000-0000-000000000012', code: 'tariff.manage', description: 'Configurer les tarifs et frais' },
  { id: '20000000-0000-0000-0000-000000000013', code: 'document.read', description: 'Consulter les documents téléversés' },
  { id: '20000000-0000-0000-0000-000000000014', code: 'document.validate', description: 'Valider ou rejeter des pièces justificatives' },
  { id: '20000000-0000-0000-0000-000000000015', code: 'media.read', description: 'Consulter la médiathèque' },
  { id: '20000000-0000-0000-0000-000000000016', code: 'media.manage', description: 'Téléverser et organiser les médias' },
  { id: '20000000-0000-0000-0000-000000000017', code: 'media.publish', description: 'Publier des médias sur le site public' },
  { id: '20000000-0000-0000-0000-000000000018', code: 'school.read', description: 'Consulter les détails des établissements' },
  { id: '20000000-0000-0000-0000-000000000019', code: 'school.manage', description: 'Créer et modifier des établissements' },
  { id: '20000000-0000-0000-0000-000000000020', code: 'year.manage', description: 'Gérer les années scolaires' },
  { id: '20000000-0000-0000-0000-000000000021', code: 'form.manage', description: 'Concevoir les formulaires personnalisés' },
  { id: '20000000-0000-0000-0000-000000000022', code: 'form.publish', description: 'Publier les formulaires' },
  { id: '20000000-0000-0000-0000-000000000023', code: 'report.read', description: 'Consulter les rapports statistiques' },
  { id: '20000000-0000-0000-0000-000000000024', code: 'report.export', description: 'Exporter les listes et synthèses' },
  { id: '20000000-0000-0000-0000-000000000025', code: 'user.read', description: 'Consulter les utilisateurs du système' },
  { id: '20000000-0000-0000-0000-000000000026', code: 'user.manage', description: 'Créer et administrer les comptes' },
  { id: '20000000-0000-0000-0000-000000000027', code: 'role.manage', description: 'Gérer les rôles et permissions' },
  { id: '20000000-0000-0000-0000-000000000028', code: 'security.read', description: 'Consulter les logs de sécurité' },
  { id: '20000000-0000-0000-0000-000000000029', code: 'security.manage', description: 'Configurer les règles d’authentification' },
  { id: '20000000-0000-0000-0000-000000000030', code: 'settings.manage', description: 'Modifier les paramètres globaux' },
  { id: '20000000-0000-0000-0000-000000000031', code: 'audit.read', description: 'Consulter l’historique d’audit complet' },
];

// ─── 9. Test Accounts (Pre-hashed password: "Password123!") ───────────────────
// Pre-computed PBKDF2 hash for local development and integration tests
export const SEED_DEFAULT_PASSWORD_HASH =
  'pbkdf2_sha512$100000$a1b2c3d4e5f6789012345678abcdef01$5c345a498b812b77a760e42d627c2688b56f9cf5c7ce1a50c82fb1074a3f5bbcfbd9e9841f3e798721c5dc73ee9f2d1e0214eb132514c45a7dcb46a94a6fe67a';

export const SEED_USERS: DbInsertUser[] = [
  // 1. Super Admin (Global access, 2FA enabled)
  {
    id: '40000000-0000-0000-0000-000000000001',
    email: 'superadmin@visionschool.dz',
    firstName: 'Nadia',
    lastName: 'Bouzid',
    phone: '0550 12 34 56',
    status: 'ACTIVE',
    passwordHash: SEED_DEFAULT_PASSWORD_HASH,
    isTwoFactorEnabled: true,
    twoFactorSecret: 'JBSWY3DPEHPK3PXP', // Sample Base32 secret
    twoFactorRecoveryCodes: [
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
      '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7',
    ],
  },
  // 2. Admin École A (Campus Hydra)
  {
    id: '40000000-0000-0000-0000-000000000002',
    email: 'admin.hydra@visionschool.dz',
    firstName: 'Yasmine',
    lastName: 'Mansouri',
    phone: '0560 12 34 56',
    status: 'ACTIVE',
    passwordHash: SEED_DEFAULT_PASSWORD_HASH,
    isTwoFactorEnabled: false,
  },
  // 3. Agent École A (Campus Hydra)
  {
    id: '40000000-0000-0000-0000-000000000003',
    email: 'agent.hydra@visionschool.dz',
    firstName: 'Ali',
    lastName: 'Kaci',
    phone: '0560 78 90 12',
    status: 'ACTIVE',
    passwordHash: SEED_DEFAULT_PASSWORD_HASH,
    isTwoFactorEnabled: false,
  },
  // 4. Agent École B (Campus El Biar)
  {
    id: '40000000-0000-0000-0000-000000000004',
    email: 'agent.elbiar@visionschool.dz',
    firstName: 'Karim',
    lastName: 'Hadj',
    phone: '0570 12 34 56',
    status: 'ACTIVE',
    passwordHash: SEED_DEFAULT_PASSWORD_HASH,
    isTwoFactorEnabled: false,
  },
];

// ─── 10. System Settings ──────────────────────────────────────────────────────
export const SEED_SYSTEM_SETTINGS: DbInsertSystemSetting[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    scope: 'GLOBAL',
    key: 'platform.name',
    valueJson: { value: 'VISION SCHOOL' },
    isPublic: true,
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    scope: 'GLOBAL',
    key: 'platform.default_academic_year',
    valueJson: { value: '2026/2027' },
    isPublic: true,
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    scope: 'GLOBAL',
    key: 'platform.default_timezone',
    valueJson: { value: 'Africa/Algiers' },
    isPublic: true,
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    scope: 'GLOBAL',
    key: 'platform.default_currency',
    valueJson: { value: 'DZD' },
    isPublic: true,
  },
  {
    id: '30000000-0000-0000-0000-000000000005',
    scope: 'GLOBAL',
    key: 'registration.allow_public_submission',
    valueJson: { value: true },
    isPublic: true,
  },
];
