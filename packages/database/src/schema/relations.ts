/**
 * Drizzle ORM Relations across all domain entities for VISION SCHOOL.
 * Enables type-safe relational queries and joins across schools, registrations,
 * capacities, documents, RBAC, and audit layers.
 */

import { relations } from 'drizzle-orm';
import { schools } from './schools';
import { academicYears } from './academic-years';
import { cycles, levels } from './cycles';
import { schoolYearLevels } from './school-year-levels';
import { tariffs } from './tariffs';
import { parents } from './parents';
import { students } from './students';
import { registrations, registrationStatusHistory, registrationNotes } from './registrations';
import { waitingListEntries } from './waiting-list';
import { documentTypes, schoolLevelDocumentRequirements, registrationDocuments } from './documents';
import { mediaAssets, schoolMediaAssignments } from './media';
import { formDefinitions, formSections, formFields, registrationCustomFieldValues } from './forms';
import { users, roles, permissions, rolePermissions, userRoles, userSchoolAccess, userLevelAccess } from './users';
import { notifications, notificationPreferences } from './notifications';
import { auditLogs } from './audit';
import { systemSettings } from './settings';
import { faqItems, contactMessages, publicContentBlocks } from './content';
import { consentRecords, policyVersions } from './consent';
import { loginEvents, userSessions } from './security';

// ─── Schools Relations ────────────────────────────────────────────────────────
export const schoolsRelations = relations(schools, ({ many }) => ({
  schoolYearLevels: many(schoolYearLevels),
  mediaAssets: many(mediaAssets),
  schoolMediaAssignments: many(schoolMediaAssignments),
  formDefinitions: many(formDefinitions),
  userSchoolAccess: many(userSchoolAccess),
  userLevelAccess: many(userLevelAccess),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  systemSettings: many(systemSettings),
  faqItems: many(faqItems),
  contactMessages: many(contactMessages),
  publicContentBlocks: many(publicContentBlocks),
  registrations: many(registrations),
  documentRequirements: many(schoolLevelDocumentRequirements),
}));

// ─── Academic Years Relations ─────────────────────────────────────────────────
export const academicYearsRelations = relations(academicYears, ({ many }) => ({
  schoolYearLevels: many(schoolYearLevels),
  formDefinitions: many(formDefinitions),
  registrations: many(registrations),
  documentRequirements: many(schoolLevelDocumentRequirements),
}));

// ─── Cycles & Levels Relations ────────────────────────────────────────────────
export const cyclesRelations = relations(cycles, ({ many }) => ({
  levels: many(levels),
  documentRequirements: many(schoolLevelDocumentRequirements),
}));

export const levelsRelations = relations(levels, ({ one, many }) => ({
  cycle: one(cycles, {
    fields: [levels.cycleId],
    references: [cycles.id],
  }),
  schoolYearLevels: many(schoolYearLevels),
  userLevelAccess: many(userLevelAccess),
  registrations: many(registrations),
  documentRequirements: many(schoolLevelDocumentRequirements),
}));

// ─── School Year Levels Relations ─────────────────────────────────────────────
export const schoolYearLevelsRelations = relations(schoolYearLevels, ({ one, many }) => ({
  school: one(schools, {
    fields: [schoolYearLevels.schoolId],
    references: [schools.id],
  }),
  academicYear: one(academicYears, {
    fields: [schoolYearLevels.academicYearId],
    references: [academicYears.id],
  }),
  level: one(levels, {
    fields: [schoolYearLevels.levelId],
    references: [levels.id],
  }),
  tariffs: many(tariffs),
  registrations: many(registrations),
  waitingListEntries: many(waitingListEntries),
}));

// ─── Tariffs Relations ────────────────────────────────────────────────────────
export const tariffsRelations = relations(tariffs, ({ one, many }) => ({
  schoolYearLevel: one(schoolYearLevels, {
    fields: [tariffs.schoolYearLevelId],
    references: [schoolYearLevels.id],
  }),
  registrations: many(registrations),
}));

// ─── Parents & Students Relations ─────────────────────────────────────────────
export const parentsRelations = relations(parents, ({ many }) => ({
  registrations: many(registrations),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  registrations: many(registrations),
}));

// ─── Registrations Relations ──────────────────────────────────────────────────
export const registrationsRelations = relations(registrations, ({ one, many }) => ({
  school: one(schools, {
    fields: [registrations.schoolId],
    references: [schools.id],
  }),
  academicYear: one(academicYears, {
    fields: [registrations.academicYearId],
    references: [academicYears.id],
  }),
  level: one(levels, {
    fields: [registrations.levelId],
    references: [levels.id],
  }),
  schoolYearLevel: one(schoolYearLevels, {
    fields: [registrations.schoolYearLevelId],
    references: [schoolYearLevels.id],
  }),
  parent: one(parents, {
    fields: [registrations.parentId],
    references: [parents.id],
  }),
  student: one(students, {
    fields: [registrations.studentId],
    references: [students.id],
  }),
  tariff: one(tariffs, {
    fields: [registrations.tariffId],
    references: [tariffs.id],
  }),
  statusHistory: many(registrationStatusHistory),
  notes: many(registrationNotes),
  waitingListEntries: many(waitingListEntries),
  documents: many(registrationDocuments),
  customFieldValues: many(registrationCustomFieldValues),
  consentRecords: many(consentRecords),
}));

export const registrationStatusHistoryRelations = relations(registrationStatusHistory, ({ one }) => ({
  registration: one(registrations, {
    fields: [registrationStatusHistory.registrationId],
    references: [registrations.id],
  }),
}));

export const registrationNotesRelations = relations(registrationNotes, ({ one }) => ({
  registration: one(registrations, {
    fields: [registrationNotes.registrationId],
    references: [registrations.id],
  }),
  user: one(users, {
    fields: [registrationNotes.userId],
    references: [users.id],
  }),
}));

// ─── Waiting List Relations ───────────────────────────────────────────────────
export const waitingListEntriesRelations = relations(waitingListEntries, ({ one }) => ({
  registration: one(registrations, {
    fields: [waitingListEntries.registrationId],
    references: [registrations.id],
  }),
  schoolYearLevel: one(schoolYearLevels, {
    fields: [waitingListEntries.schoolYearLevelId],
    references: [schoolYearLevels.id],
  }),
}));

// ─── Documents Relations ──────────────────────────────────────────────────────
export const documentTypesRelations = relations(documentTypes, ({ many }) => ({
  requirements: many(schoolLevelDocumentRequirements),
  registrationDocuments: many(registrationDocuments),
}));

export const schoolLevelDocumentRequirementsRelations = relations(
  schoolLevelDocumentRequirements,
  ({ one }) => ({
    school: one(schools, {
      fields: [schoolLevelDocumentRequirements.schoolId],
      references: [schools.id],
    }),
    academicYear: one(academicYears, {
      fields: [schoolLevelDocumentRequirements.academicYearId],
      references: [academicYears.id],
    }),
    level: one(levels, {
      fields: [schoolLevelDocumentRequirements.levelId],
      references: [levels.id],
    }),
    cycle: one(cycles, {
      fields: [schoolLevelDocumentRequirements.cycleId],
      references: [cycles.id],
    }),
    documentType: one(documentTypes, {
      fields: [schoolLevelDocumentRequirements.documentTypeId],
      references: [documentTypes.id],
    }),
  })
);

export const registrationDocumentsRelations = relations(registrationDocuments, ({ one }) => ({
  registration: one(registrations, {
    fields: [registrationDocuments.registrationId],
    references: [registrations.id],
  }),
  documentType: one(documentTypes, {
    fields: [registrationDocuments.documentTypeId],
    references: [documentTypes.id],
  }),
  replacesDocument: one(registrationDocuments, {
    fields: [registrationDocuments.replacesDocumentId],
    references: [registrationDocuments.id],
  }),
}));

// ─── Media Relations ──────────────────────────────────────────────────────────
export const mediaAssetsRelations = relations(mediaAssets, ({ one, many }) => ({
  school: one(schools, {
    fields: [mediaAssets.schoolId],
    references: [schools.id],
  }),
  assignments: many(schoolMediaAssignments),
}));

export const schoolMediaAssignmentsRelations = relations(schoolMediaAssignments, ({ one }) => ({
  school: one(schools, {
    fields: [schoolMediaAssignments.schoolId],
    references: [schools.id],
  }),
  mediaAsset: one(mediaAssets, {
    fields: [schoolMediaAssignments.mediaAssetId],
    references: [mediaAssets.id],
  }),
}));

// ─── Forms Relations ──────────────────────────────────────────────────────────
export const formDefinitionsRelations = relations(formDefinitions, ({ one, many }) => ({
  school: one(schools, {
    fields: [formDefinitions.schoolId],
    references: [schools.id],
  }),
  academicYear: one(academicYears, {
    fields: [formDefinitions.academicYearId],
    references: [academicYears.id],
  }),
  sections: many(formSections),
}));

export const formSectionsRelations = relations(formSections, ({ one, many }) => ({
  formDefinition: one(formDefinitions, {
    fields: [formSections.formDefinitionId],
    references: [formDefinitions.id],
  }),
  fields: many(formFields),
}));

export const formFieldsRelations = relations(formFields, ({ one, many }) => ({
  formSection: one(formSections, {
    fields: [formFields.formSectionId],
    references: [formSections.id],
  }),
  customValues: many(registrationCustomFieldValues),
}));

export const registrationCustomFieldValuesRelations = relations(
  registrationCustomFieldValues,
  ({ one }) => ({
    registration: one(registrations, {
      fields: [registrationCustomFieldValues.registrationId],
      references: [registrations.id],
    }),
    formField: one(formFields, {
      fields: [registrationCustomFieldValues.formFieldId],
      references: [formFields.id],
    }),
  })
);

// ─── Users & RBAC Relations ───────────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  avatarMedia: one(mediaAssets, {
    fields: [users.avatarMediaId],
    references: [mediaAssets.id],
  }),
  userRoles: many(userRoles),
  schoolAccess: many(userSchoolAccess),
  levelAccess: many(userLevelAccess),
  notifications: many(notifications),
  notificationPreferences: many(notificationPreferences),
  auditLogs: many(auditLogs),
  loginEvents: many(loginEvents),
  sessions: many(userSessions),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const userSchoolAccessRelations = relations(userSchoolAccess, ({ one }) => ({
  user: one(users, {
    fields: [userSchoolAccess.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [userSchoolAccess.schoolId],
    references: [schools.id],
  }),
}));

export const userLevelAccessRelations = relations(userLevelAccess, ({ one }) => ({
  user: one(users, {
    fields: [userLevelAccess.userId],
    references: [users.id],
  }),
  level: one(levels, {
    fields: [userLevelAccess.levelId],
    references: [levels.id],
  }),
  school: one(schools, {
    fields: [userLevelAccess.schoolId],
    references: [schools.id],
  }),
}));

// ─── Notifications Relations ──────────────────────────────────────────────────
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [notifications.schoolId],
    references: [schools.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

// ─── Audit Relations ──────────────────────────────────────────────────────────
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [auditLogs.schoolId],
    references: [schools.id],
  }),
}));

// ─── Settings, Content, Consent, Security Relations ───────────────────────────
export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  school: one(schools, {
    fields: [systemSettings.schoolId],
    references: [schools.id],
  }),
}));

export const faqItemsRelations = relations(faqItems, ({ one }) => ({
  school: one(schools, {
    fields: [faqItems.schoolId],
    references: [schools.id],
  }),
}));

export const contactMessagesRelations = relations(contactMessages, ({ one }) => ({
  school: one(schools, {
    fields: [contactMessages.schoolId],
    references: [schools.id],
  }),
  assignedUser: one(users, {
    fields: [contactMessages.assignedUserId],
    references: [users.id],
  }),
}));

export const publicContentBlocksRelations = relations(publicContentBlocks, ({ one }) => ({
  school: one(schools, {
    fields: [publicContentBlocks.schoolId],
    references: [schools.id],
  }),
}));

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  registration: one(registrations, {
    fields: [consentRecords.registrationId],
    references: [registrations.id],
  }),
}));

export const loginEventsRelations = relations(loginEvents, ({ one }) => ({
  user: one(users, {
    fields: [loginEvents.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));
