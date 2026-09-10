/**
 * Auto-migration script for VISION SCHOOL PostgreSQL database.
 * Generates all enums and tables directly matching Drizzle ORM schema.
 */

import { DatabaseClient } from '../client';

export async function autoMigrate(): Promise<void> {
  const client = DatabaseClient.getInstance();
  const pool = client.pgPool;

  console.log('🚀 [DB AUTO-MIGRATE] Aligning schema, enums, and tables with Drizzle schema...');

  await pool.query(`
    -- Extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Enums
    DO $$ BEGIN
      CREATE TYPE academic_year_status AS ENUM ('DRAFT', 'PREPARING', 'ACTIVE', 'CLOSED', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE registration_status AS ENUM ('NEW', 'UNDER_REVIEW', 'PENDING', 'ACCEPTED', 'REFUSED', 'WAITLISTED', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE registration_source AS ENUM ('PUBLIC_WEB', 'MOBILE_APP', 'ADMIN_MANUAL', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE gender AS ENUM ('MALE', 'FEMALE');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE capacity_mode AS ENUM ('LIMITED', 'UNLIMITED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE full_behavior AS ENUM ('WAITLIST', 'CLOSE', 'RECEIVE_WITHOUT_ACCEPTANCE');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE capacity_reservation_status AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED', 'RELEASED', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE document_status AS ENUM ('UPLOADED', 'PENDING_REVIEW', 'VALIDATED', 'REJECTED', 'REPLACEMENT_REQUIRED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE file_rule_type AS ENUM ('IMAGE', 'PDF', 'IMAGE_OR_PDF', 'ANY');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE uploaded_by_type AS ENUM ('PARENT', 'ADMIN');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE media_status AS ENUM ('DRAFT', 'PUBLISHED', 'INACTIVE', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE media_type AS ENUM ('LOGO', 'HERO', 'BACKGROUND', 'GALLERY', 'ICON', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE media_placement AS ENUM ('CLIENT_HEADER_LOGO', 'CLIENT_FOOTER_LOGO', 'CLIENT_HERO', 'CLIENT_REGISTRATION_BACKGROUND', 'CLIENT_ABOUT_IMAGE', 'CLIENT_CONTACT_IMAGE', 'CLIENT_GALLERY', 'ADMIN_SIDEBAR_LOGO', 'ADMIN_LOGIN_LOGO', 'ADMIN_LOGIN_BACKGROUND', 'APP_LOGO', 'APP_SPLASH', 'FAVICON', 'SCHOOL_CARD_IMAGE', 'HEADER_LOGO', 'ADMIN_LOGO', 'CONTACT_IMAGE', 'GALLERY', 'LOGIN_BACKGROUND', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE user_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED', 'LOCKED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE waiting_list_status AS ENUM ('ACTIVE', 'SKIPPED_TEMPORARILY', 'OFFERED', 'PROMOTED', 'REMOVED', 'CANCELLED', 'EXPIRED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE waiting_list_offer_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE audit_result AS ENUM ('SUCCESS', 'FAILURE', 'PARTIAL');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE login_event_type AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'TWO_FACTOR_CHALLENGE_ISSUED', 'TWO_FACTOR_VERIFIED', 'TWO_FACTOR_FAILED', 'SESSION_REVOKED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE login_event_result AS ENUM ('SUCCESS', 'FAILURE', 'BLOCKED', 'CHALLENGE_REQUIRED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE faq_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE contact_message_status AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE content_block_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    -- Drop & Recreate cleanly if starting fresh
    DROP TABLE IF EXISTS public_content_blocks CASCADE;
    DROP TABLE IF EXISTS contact_messages CASCADE;
    DROP TABLE IF EXISTS faq_items CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS registration_notes CASCADE;
    DROP TABLE IF EXISTS registration_status_history CASCADE;
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS waiting_list_entries CASCADE;
    DROP TABLE IF EXISTS registrations CASCADE;
    DROP TABLE IF EXISTS students CASCADE;
    DROP TABLE IF EXISTS parents CASCADE;
    DROP TABLE IF EXISTS two_factor_challenges CASCADE;
    DROP TABLE IF EXISTS login_events CASCADE;
    DROP TABLE IF EXISTS user_sessions CASCADE;
    DROP TABLE IF EXISTS user_school_access CASCADE;
    DROP TABLE IF EXISTS user_level_access CASCADE;
    DROP TABLE IF EXISTS user_roles CASCADE;
    DROP TABLE IF EXISTS role_permissions CASCADE;
    DROP TABLE IF EXISTS permissions CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS document_types CASCADE;
    DROP TABLE IF EXISTS education_transitions CASCADE;
    DROP TABLE IF EXISTS tariffs CASCADE;
    DROP TABLE IF EXISTS school_year_levels CASCADE;
    DROP TABLE IF EXISTS level_choices CASCADE;
    DROP TABLE IF EXISTS levels CASCADE;
    DROP TABLE IF EXISTS cycles CASCADE;
    DROP TABLE IF EXISTS schools CASCADE;
    DROP TABLE IF EXISTS academic_years CASCADE;
    DROP TABLE IF EXISTS system_settings CASCADE;

    -- 1. Academic Years
    CREATE TABLE academic_years (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status academic_year_status NOT NULL DEFAULT 'DRAFT',
      is_active_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    -- 2. Schools
    CREATE TABLE schools (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      short_name VARCHAR(100),
      code VARCHAR(50) NOT NULL UNIQUE,
      description TEXT,
      phone_primary VARCHAR(50),
      phone_secondary VARCHAR(50),
      whatsapp VARCHAR(50),
      email_primary VARCHAR(255),
      email_secondary VARCHAR(255),
      website VARCHAR(500),
      opening_hours_json JSONB,
      social_links_json JSONB,
      is_phone_public BOOLEAN NOT NULL DEFAULT true,
      is_email_public BOOLEAN NOT NULL DEFAULT true,
      is_whatsapp_public BOOLEAN NOT NULL DEFAULT true,
      is_map_public BOOLEAN NOT NULL DEFAULT true,
      address TEXT,
      wilaya VARCHAR(100),
      commune VARCHAR(100),
      postal_code VARCHAR(10),
      country VARCHAR(100) DEFAULT 'Algérie',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      google_maps_url TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    -- 3. Cycles
    CREATE TABLE cycles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) NOT NULL UNIQUE,
      name_fr VARCHAR(150) NOT NULL,
      name_ar VARCHAR(150),
      display_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    -- 4. Levels
    CREATE TABLE levels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE RESTRICT,
      code VARCHAR(50) NOT NULL UNIQUE,
      name_fr VARCHAR(150) NOT NULL,
      name_ar VARCHAR(150),
      display_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    -- 4b. Level Choices
    CREATE TABLE level_choices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      level_id UUID NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
      parent_id UUID REFERENCES level_choices(id) ON DELETE CASCADE,
      code VARCHAR(50) NOT NULL UNIQUE,
      name_fr VARCHAR(150) NOT NULL,
      name_ar VARCHAR(150),
      description TEXT,
      node_type VARCHAR(30) NOT NULL DEFAULT 'CHOICE',
      display_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    -- 5. School Year Levels
    CREATE TABLE school_year_levels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
      level_id UUID NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
      choice_id UUID REFERENCES level_choices(id) ON DELETE CASCADE,
      is_visible_client BOOLEAN NOT NULL DEFAULT true,
      registration_status registration_status NOT NULL DEFAULT 'NEW',
      registration_open BOOLEAN NOT NULL DEFAULT true,
      registration_open_at TIMESTAMPTZ,
      registration_close_at TIMESTAMPTZ,
      capacity_mode capacity_mode NOT NULL DEFAULT 'LIMITED',
      capacity_max INT DEFAULT 255,
      full_behavior full_behavior NOT NULL DEFAULT 'WAITLIST',
      waiting_list_enabled BOOLEAN NOT NULL DEFAULT true,
      waiting_list_max INT,
      show_remaining_places BOOLEAN NOT NULL DEFAULT false,
      show_status_client BOOLEAN NOT NULL DEFAULT true,
      show_fill_rate BOOLEAN NOT NULL DEFAULT false,
      near_full_threshold INT DEFAULT 85,
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    -- 5b. Education Transitions
    CREATE TABLE education_transitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
      from_choice_id UUID REFERENCES level_choices(id) ON DELETE CASCADE,
      to_level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
      to_choice_id UUID REFERENCES level_choices(id) ON DELETE CASCADE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 6. Tariffs
    CREATE TABLE tariffs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_year_level_id UUID NOT NULL REFERENCES school_year_levels(id) ON DELETE RESTRICT,
      amount INT NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'DZD',
      show_client BOOLEAN NOT NULL DEFAULT true,
      hidden_client_message_fr TEXT,
      hidden_client_message_ar TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
      valid_from TIMESTAMPTZ,
      valid_to TIMESTAMPTZ,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 7. Document Types
    CREATE TABLE document_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name_fr VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      description_fr TEXT,
      description_ar TEXT,
      file_rule_type file_rule_type NOT NULL DEFAULT 'IMAGE_OR_PDF',
      max_file_size_bytes INT DEFAULT 5242880,
      max_files INT DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 8. Roles & Permissions
    CREATE TABLE roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_system_role BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE role_permissions (
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (role_id, permission_id)
    );

    -- 9. Users & Security
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      auth_provider_id VARCHAR(255),
      first_name VARCHAR(150) NOT NULL,
      last_name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50),
      avatar_media_id UUID,
      status user_status NOT NULL DEFAULT 'ACTIVE',
      password_hash VARCHAR(255),
      two_factor_secret VARCHAR(255),
      is_two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
      two_factor_recovery_codes JSONB,
      two_factor_configured_at TIMESTAMPTZ,
      failed_login_attempts INT NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      last_failed_login_at TIMESTAMPTZ,
      invitation_token VARCHAR(255),
      invitation_expires_at TIMESTAMPTZ,
      invited_by_user_id UUID,
      invited_at TIMESTAMPTZ,
      accepted_invitation_at TIMESTAMPTZ,
      password_reset_token VARCHAR(255),
      password_reset_expires_at TIMESTAMPTZ,
      suspended_until TIMESTAMPTZ,
      suspension_reason TEXT,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      disabled_at TIMESTAMPTZ,
      archived_at TIMESTAMPTZ
    );

    CREATE TABLE user_roles (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, role_id)
    );

    CREATE TABLE user_school_access (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, school_id)
    );

    CREATE TABLE user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      session_provider_id VARCHAR(255),
      device_info TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      is_revoked BOOLEAN NOT NULL DEFAULT false,
      expires_at TIMESTAMPTZ NOT NULL,
      last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    );

    CREATE TABLE login_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      email_attempted VARCHAR(255),
      event_type login_event_type NOT NULL,
      result login_event_result NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE two_factor_challenges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_token VARCHAR(255) NOT NULL UNIQUE,
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 5,
      expires_at TIMESTAMPTZ NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 10. Parents & Students
    CREATE TABLE parents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name VARCHAR(300) NOT NULL,
      address TEXT,
      phone_primary VARCHAR(30) NOT NULL,
      phone_secondary VARCHAR(30),
      whatsapp VARCHAR(30),
      email VARCHAR(255),
      wilaya VARCHAR(100),
      commune VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name VARCHAR(300) NOT NULL,
      first_name VARCHAR(150),
      last_name VARCHAR(150),
      birth_date DATE NOT NULL,
      birth_place VARCHAR(255),
      gender gender NOT NULL,
      current_school VARCHAR(255),
      wilaya VARCHAR(100),
      commune VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 11. Registrations & Waiting List
    CREATE TABLE registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_code VARCHAR(30) NOT NULL UNIQUE,
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
      level_id UUID NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
      choice_id UUID REFERENCES level_choices(id) ON DELETE RESTRICT,
      school_year_level_id UUID NOT NULL REFERENCES school_year_levels(id) ON DELETE RESTRICT,
      parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE RESTRICT,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      status registration_status NOT NULL DEFAULT 'NEW',
      source registration_source NOT NULL DEFAULT 'PUBLIC_WEB',
      tariff_id UUID REFERENCES tariffs(id) ON DELETE SET NULL,
      tariff_amount_snapshot INT,
      tariff_currency_snapshot VARCHAR(10) DEFAULT 'DZD',
      client_tariff_visible_snapshot BOOLEAN DEFAULT true,
      form_definition_id UUID,
      form_version INT,
      public_tracking_enabled BOOLEAN NOT NULL DEFAULT true,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      accepted_at TIMESTAMPTZ,
      refused_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      waitlisted_at TIMESTAMPTZ,
      assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    CREATE TABLE registration_status_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      from_status registration_status,
      to_status registration_status NOT NULL,
      changed_by_user_id UUID,
      reason_code VARCHAR(100),
      internal_comment TEXT,
      public_comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE registration_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE waiting_list_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      school_year_level_id UUID NOT NULL REFERENCES school_year_levels(id) ON DELETE RESTRICT,
      entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      original_position INT,
      priority_type VARCHAR(50),
      priority_reason TEXT,
      manual_priority INT,
      status waiting_list_status NOT NULL DEFAULT 'ACTIVE',
      offer_status waiting_list_offer_status,
      offer_created_at TIMESTAMPTZ,
      offer_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 12. Content (FAQ, Contact, Blocks)
    CREATE TABLE faq_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
      category VARCHAR(100),
      question_fr TEXT NOT NULL,
      question_ar TEXT,
      answer_fr TEXT NOT NULL,
      answer_ar TEXT,
      keywords_json JSONB,
      display_order INT NOT NULL DEFAULT 0,
      is_featured BOOLEAN NOT NULL DEFAULT false,
      status faq_status NOT NULL DEFAULT 'PUBLISHED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE contact_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
      full_name VARCHAR(300) NOT NULL,
      phone VARCHAR(30),
      email VARCHAR(255),
      subject VARCHAR(500),
      message TEXT NOT NULL,
      status contact_message_status NOT NULL DEFAULT 'NEW',
      assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE public_content_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
      page VARCHAR(100) NOT NULL,
      section_key VARCHAR(100) NOT NULL,
      content_json JSONB,
      status content_block_status NOT NULL DEFAULT 'PUBLISHED',
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 13. Notifications, Audit Logs & System Settings
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      target_entity_type VARCHAR(50),
      target_entity_id UUID,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      module VARCHAR(100),
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID,
      school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
      before_json JSONB,
      after_json JSONB,
      metadata_json JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      result audit_result NOT NULL DEFAULT 'SUCCESS',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope VARCHAR(30) NOT NULL DEFAULT 'GLOBAL',
      school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
      key VARCHAR(200) NOT NULL,
      value_json JSONB,
      is_public BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS saved_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      report_type VARCHAR(100) NOT NULL,
      filters_json JSONB,
      columns_json JSONB,
      sort_json JSONB,
      is_shared BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sr_user ON saved_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_sr_type ON saved_reports(report_type);

    CREATE TABLE IF NOT EXISTS report_exports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      report_type VARCHAR(100) NOT NULL,
      school_scope_json JSONB,
      filters_json JSONB,
      format VARCHAR(20) NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      storage_key TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'READY',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_re_user ON report_exports(user_id);
    CREATE INDEX IF NOT EXISTS idx_re_created ON report_exports(created_at);
  `);

  console.log('✅ [DB AUTO-MIGRATE] Schema, enums, and tables created successfully.');
}

if (require.main === module) {
  autoMigrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Auto-migration failed:', err);
      process.exit(1);
    });
}
