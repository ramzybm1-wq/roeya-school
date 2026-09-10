/**
 * Domain types for Users, Roles, Permissions, and Audit Events.
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'AGENT';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED';

export type PermissionCode =
  | 'dashboard.read'
  | 'registration.read'
  | 'registration.create'
  | 'registration.update'
  | 'registration.accept'
  | 'registration.refuse'
  | 'registration.cancel'
  | 'registration.delete'
  | 'waiting_list.manage'
  | 'waitinglist.manage'
  | 'capacity.read'
  | 'capacity.manage'
  | 'tariff.read'
  | 'tariff.manage'
  | 'document.read'
  | 'document.validate'
  | 'media.read'
  | 'media.manage'
  | 'media.publish'
  | 'form.manage'
  | 'form.publish'
  | 'contact.manage'
  | 'content.manage'
  | 'school.read'
  | 'school.manage'
  | 'school.delete'
  | 'academic_year.manage'
  | 'year.manage'
  | 'education.manage'
  | 'education.delete'
  | 'users.read'
  | 'users.manage'
  | 'users.delete'
  | 'user.read'
  | 'user.manage'
  | 'user.delete'
  | 'roles.manage'
  | 'role.manage'
  | 'report.read'
  | 'report.export'
  | 'reports.export'
  | 'reports.read'
  | 'security.read'
  | 'security.manage'
  | 'settings.read'
  | 'settings.manage'
  | 'audit.read';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  allowedSchoolIds: string[]; // Empty array means all schools (for SUPER_ADMIN)
  permissions?: PermissionCode[];
  customPermissions?: PermissionCode[];
  isTwoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: PermissionCode[];
  allowedSchoolIds: string[];
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: string;
  createdAt: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
}

export type AuditAction =
  | 'REGISTRATION_CREATED'
  | 'REGISTRATION_STATUS_UPDATED'
  | 'REGISTRATION_DELETED'
  | 'DOCUMENT_VALIDATED'
  | 'DOCUMENT_REJECTED'
  | 'CAPACITY_UPDATED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'SETTINGS_UPDATED'
  | (string & {});

export interface AuditEvent {
  id: string;
  action: AuditAction;
  performedByUserId?: string;
  performedByEmail?: string;
  userRole?: string;
  schoolId?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
  metadataJson?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  result?: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  createdAt: string;
}
