/**
 * PostgreSQL Enum Definitions for VISION SCHOOL.
 * All enums are defined as pgEnum() for type-safe column usage across schema files.
 */

import { pgEnum } from 'drizzle-orm/pg-core';

// ─── Academic Year ───────────────────────────────────────────────────────────
export const academicYearStatusEnum = pgEnum('academic_year_status', [
  'DRAFT',
  'PREPARING',
  'ACTIVE',
  'CLOSED',
  'ARCHIVED',
]);

// ─── Registration ────────────────────────────────────────────────────────────
export const registrationStatusEnum = pgEnum('registration_status', [
  'NEW',
  'UNDER_REVIEW',
  'PENDING',
  'ACCEPTED',
  'REFUSED',
  'WAITLISTED',
  'CANCELLED',
]);

export const registrationSourceEnum = pgEnum('registration_source', [
  'PUBLIC_WEB',
  'MOBILE_APP',
  'ADMIN_MANUAL',
  'OTHER',
]);

// ─── Gender ──────────────────────────────────────────────────────────────────
export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE']);

// ─── Capacity ────────────────────────────────────────────────────────────────
export const capacityModeEnum = pgEnum('capacity_mode', ['LIMITED', 'UNLIMITED']);

export const fullBehaviorEnum = pgEnum('full_behavior', [
  'WAITLIST',
  'CLOSE',
  'RECEIVE_WITHOUT_ACCEPTANCE',
]);

// ─── Capacity Reservations ───────────────────────────────────────────────────
export const capacityReservationStatusEnum = pgEnum('capacity_reservation_status', [
  'ACTIVE',
  'CONSUMED',
  'EXPIRED',
  'RELEASED',
  'CANCELLED',
]);

// ─── Documents ───────────────────────────────────────────────────────────────
export const documentStatusEnum = pgEnum('document_status', [
  'UPLOADED',
  'PENDING_REVIEW',
  'VALIDATED',
  'REJECTED',
  'REPLACEMENT_REQUIRED',
]);

export const fileRuleTypeEnum = pgEnum('file_rule_type', [
  'IMAGE',
  'PDF',
  'IMAGE_OR_PDF',
  'ANY',
]);

export const uploadedByTypeEnum = pgEnum('uploaded_by_type', ['PARENT', 'ADMIN']);

// ─── Media ───────────────────────────────────────────────────────────────────
export const mediaStatusEnum = pgEnum('media_status', [
  'DRAFT',
  'PUBLISHED',
  'INACTIVE',
  'ARCHIVED',
]);

export const mediaTypeEnum = pgEnum('media_type', [
  'LOGO',
  'HERO',
  'BACKGROUND',
  'GALLERY',
  'ICON',
  'OTHER',
]);

export const mediaPlacementEnum = pgEnum('media_placement', [
  'CLIENT_HEADER_LOGO',
  'CLIENT_FOOTER_LOGO',
  'CLIENT_HERO',
  'CLIENT_REGISTRATION_BACKGROUND',
  'CLIENT_ABOUT_IMAGE',
  'CLIENT_CONTACT_IMAGE',
  'CLIENT_GALLERY',
  'ADMIN_SIDEBAR_LOGO',
  'ADMIN_LOGIN_LOGO',
  'ADMIN_LOGIN_BACKGROUND',
  'APP_LOGO',
  'APP_SPLASH',
  'FAVICON',
  'SCHOOL_CARD_IMAGE',
  'HEADER_LOGO',
  'ADMIN_LOGO',
  'CONTACT_IMAGE',
  'GALLERY',
  'LOGIN_BACKGROUND',
  'OTHER',
]);

// ─── Forms ───────────────────────────────────────────────────────────────────
export const formStatusEnum = pgEnum('form_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const formFieldTypeEnum = pgEnum('form_field_type', [
  'TEXT',
  'TEXTAREA',
  'PHONE',
  'EMAIL',
  'NUMBER',
  'DATE',
  'SELECT',
  'RADIO',
  'CHECKBOX',
  'MULTISELECT',
  'YES_NO',
  'ADDRESS',
  'FILE',
  'INFO_BLOCK',
]);

// ─── Users ───────────────────────────────────────────────────────────────────
export const userStatusEnum = pgEnum('user_status', [
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'DISABLED',
  'LOCKED',
]);

// ─── Waiting List ────────────────────────────────────────────────────────────
export const waitingListStatusEnum = pgEnum('waiting_list_status', [
  'ACTIVE',
  'SKIPPED_TEMPORARILY',
  'OFFERED',
  'PROMOTED',
  'REMOVED',
  'CANCELLED',
  'EXPIRED',
]);

export const waitingListOfferStatusEnum = pgEnum('waiting_list_offer_status', [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
]);

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationPriorityEnum = pgEnum('notification_priority', [
  'INFO',
  'NORMAL',
  'WARNING',
  'IMPORTANT',
  'CRITICAL',
]);

// ─── Contact / FAQ / Content ─────────────────────────────────────────────────
export const contactMessageStatusEnum = pgEnum('contact_message_status', [
  'NEW',
  'IN_PROGRESS',
  'RESOLVED',
  'ARCHIVED',
]);

export const faqStatusEnum = pgEnum('faq_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const contentBlockStatusEnum = pgEnum('content_block_status', [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);

// ─── Policy & Consent ────────────────────────────────────────────────────────
export const policyTypeEnum = pgEnum('policy_type', [
  'PRIVACY',
  'TERMS',
  'COOKIES',
  'LEGAL_NOTICE',
]);

export const policyStatusEnum = pgEnum('policy_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const consentTypeEnum = pgEnum('consent_type', [
  'PRIVACY',
  'TERMS',
  'DATA_PROCESSING',
  'MARKETING',
]);

// ─── Security / Auth ─────────────────────────────────────────────────────────
export const loginEventTypeEnum = pgEnum('login_event_type', [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_RESET_REQUEST',
  'PASSWORD_RESET_COMPLETE',
  'TWO_FA_SUCCESS',
  'TWO_FA_FAILED',
  'ACCOUNT_LOCKED',
]);

export const loginEventResultEnum = pgEnum('login_event_result', ['SUCCESS', 'FAILURE']);

// ─── Audit ───────────────────────────────────────────────────────────────────
export const auditResultEnum = pgEnum('audit_result', ['SUCCESS', 'FAILURE', 'PARTIAL']);
