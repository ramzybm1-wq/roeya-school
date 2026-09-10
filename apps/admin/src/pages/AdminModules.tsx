/**
 * Admin Module Pages (Schools, Levels, Tariffs, Years, Waiting List, Documents, Media, Form Builder, Reports, Security, Users, Notifications, Settings).
 * Each maps to a specific Stitch screen and connects to live domain data.
 */

import { SEED_SCHOOLS, SEED_CYCLES, SEED_LEVELS, SEED_ACADEMIC_YEARS, SEED_DOCUMENT_TYPES } from '@vision-school/database';

// Stitch Screen '9840c014ecd647609bf041aa89218bff'
export function SchoolsPage(props?: { schools?: any[] }) {
  return {
    screenId: '9840c014ecd647609bf041aa89218bff',
    title: 'Établissements - VISION SCHOOL Administration',
    schools: props?.schools || SEED_SCHOOLS,
  };
}

// Stitch Screen 'ac88e5c7eba148a88b0fde7017787da1'
export function LevelsCapacitiesPage(props?: { cycles?: any[]; levels?: any[]; capacities?: any[] }) {
  return {
    screenId: 'ac88e5c7eba148a88b0fde7017787da1',
    title: 'Gestion des Niveaux & Capacités - VISION SCHOOL',
    cycles: props?.cycles || SEED_CYCLES,
    levels: props?.levels || SEED_LEVELS,
    capacities: props?.capacities || [],
  };
}

// Stitch Screen '7f9ed799e18f41ce99674fff14f9ad07'
export function TariffsPage(props?: { tariffs?: any[] }) {
  return {
    screenId: '7f9ed799e18f41ce99674fff14f9ad07',
    title: 'Tarifs - VISION SCHOOL Administration',
    tariffs: props?.tariffs || [],
  };
}

// Stitch Screen '0601e7df813749978ad486cdab8bf602'
export function AcademicYearsPage(props?: { years?: any[] }) {
  return {
    screenId: '0601e7df813749978ad486cdab8bf602',
    title: 'Années scolaires - VISION SCHOOL Administration',
    years: props?.years || SEED_ACADEMIC_YEARS,
  };
}

// Stitch Screen 'cef5e7e2ea0043f0809dd65b492442e5'
export function WaitingListPage(props?: { queueItems?: any[]; summary?: any }) {
  return {
    screenId: 'cef5e7e2ea0043f0809dd65b492442e5',
    title: "Liste d'attente - VISION SCHOOL Administration",
    queue: props?.queueItems || [],
    summary: props?.summary || {
      activeWaitingCount: 0,
      availablePlaces: 0,
      nextCandidate: null,
      pendingOffersCount: 0,
    },
  };
}

// Stitch Screen '8556ce72c3464bcf9b1466cd92aae4c5'
export function DocumentsConfigPage(props?: { documentTypes?: any[]; requirements?: any[]; reviewQueue?: any[] }) {
  return {
    screenId: '8556ce72c3464bcf9b1466cd92aae4c5',
    title: 'Documents & Pièces Justificatives - VISION SCHOOL Administration',
    documentTypes: props?.documentTypes || SEED_DOCUMENT_TYPES,
    requirements: props?.requirements || [],
    reviewQueue: props?.reviewQueue || [],
  };
}

// Stitch Screen '9b56f0881d9348329c4b965092423752'
export function MediaPage(props?: { mediaList?: any[]; branding?: any }) {
  return {
    screenId: '9b56f0881d9348329c4b965092423752',
    title: 'Médias & Images - VISION SCHOOL Administration',
    mediaList: props?.mediaList || [],
    branding: props?.branding || null,
  };
}

// Stitch Screen for Form Builder
export function FormBuilderPage(props?: { formDefinition?: any }) {
  return {
    screenId: 'form_builder_admin_screen',
    title: 'Formulaire d’inscription Builder - VISION SCHOOL Administration',
    form: props?.formDefinition || null,
  };
}

// Stitch Screen 'bf79374282ec421aaaf784778585b975'
export function ReportsPage(props?: {
  previewData?: any;
  savedReports?: any[];
  exportHistory?: any[];
  activeTemplate?: string;
}) {
  const templates = [
    { key: 'REGISTRATIONS_GLOBAL', label: 'Rapport Global des Inscriptions', description: 'Vue exhaustive de tous les dossiers déposés' },
    { key: 'ACCEPTED_REGISTRATIONS', label: 'Liste des Inscriptions Acceptées', description: 'Dossiers validés et admis pour l’année' },
    { key: 'WAITING_LIST', label: 'Rapport de la Liste d’Attente', description: 'Position chronologique FIFO et historique d’offres' },
    { key: 'CAPACITY_BY_LEVEL', label: 'Capacités et Places par Niveau', description: 'Taux de remplissage et places disponibles par classe' },
    { key: 'ACADEMIC_YEAR_COMPARISON', label: 'Analyse Comparative Inter-Années', description: 'Évolution des demandes et admissions N vs N-1' },
    { key: 'DOCUMENT_STATUS', label: 'État d’Avancement des Documents', description: 'Dossiers complets, en attente de vérification ou incomplets' },
  ];

  return {
    screenId: 'bf79374282ec421aaaf784778585b975',
    title: 'Rapports & Exports - VISION SCHOOL Administration',
    templates,
    activeTemplate: props?.activeTemplate || 'REGISTRATIONS_GLOBAL',
    previewData: props?.previewData || null,
    savedReports: props?.savedReports || [],
    exportHistory: props?.exportHistory || [],
    schools: SEED_SCHOOLS.filter((s) => s.isActive),
    academicYears: SEED_ACADEMIC_YEARS,
    levels: SEED_LEVELS,
  };
}

// Stitch Screen '09cda1a30664418ab80ce9bc733fa7fe'
export function UsersRolesPage(props?: { users?: any[] }) {
  return { screenId: '09cda1a30664418ab80ce9bc733fa7fe', title: 'Utilisateurs & Rôles - VISION SCHOOL Administration', users: props?.users || [] };
}

// Stitch Screen for Security & Audit
export function SecurityPage(props?: {
  securityScore?: number;
  checklist?: any[];
  activeSessions?: any[];
  backupHealth?: any;
  securityEvents?: any[];
}) {
  return {
    screenId: 'security_admin_screen',
    title: 'Sécurité & Journal d’audit - VISION SCHOOL Administration',
    securityScore: props?.securityScore || 100,
    checklist: props?.checklist || [],
    activeSessions: props?.activeSessions || [],
    backupHealth: props?.backupHealth || null,
    securityEvents: props?.securityEvents || [],
  };
}

// Stitch Screen 'ef877c077f4a4bf8a2e92e38ac8da2ff'
export function NotificationsPage(props?: { notifications?: any[] }) {
  return { screenId: 'ef877c077f4a4bf8a2e92e38ac8da2ff', title: 'Centre de notifications - VISION SCHOOL Administration', notifications: props?.notifications || [] };
}

// Stitch Screen 'ef9453b6fb3745748b327c092c1e7c0e'
export function SettingsPage() {
  return { screenId: 'ef9453b6fb3745748b327c092c1e7c0e', title: 'Paramètres généraux - VISION SCHOOL Administration' };
}

// Stitch Screens for Admin Auth
export function AdminLoginPage() {
  return { screenId: 'e632601283464c20a1d8f97e00d3ce90', title: 'Connexion - VISION SCHOOL Administration' };
}

export function AdminTwoFactorPage() {
  return { screenId: '95c497280051453aaa202a9c60484a51', title: 'Vérification 2FA - VISION SCHOOL Administration' };
}

export function AdminForgotPasswordPage() {
  return { screenId: 'a8bf42d495e049c2af6aae10b5d4257d', title: 'Mot de passe oublié - VISION SCHOOL Administration' };
}
