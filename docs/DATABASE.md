# VISION SCHOOL - Database Architecture & Schema Specification

This document provides the complete technical specification for the VISION SCHOOL PostgreSQL database, built with **Drizzle ORM**.

---

## 1. Core Principles

- **PostgreSQL Native**: Leverages native enums, check constraints, composite unique indexes, sequences, and JSONB columns.
- **TypeScript-First**: Drizzle ORM provides 100% type inference for selects, inserts, and relations across `@vision-school/database` and `@vision-school/shared`.
- **Foreign Key Safety**: Historical entities (schools, academic years, registrations) use `RESTRICT` on delete to prevent cascading accidental data destruction. Child audit logs and status history use `CASCADE` from the parent dossier or `SET NULL` on user references.
- **Dynamic Capacity Rule**: `places_remaining` is **never** persisted as mutable state. Available places are computed dynamically:
  $$\text{places\_remaining} = \text{capacity\_max} - \text{COUNT}(\text{ACCEPTED registrations})$$
- **Secure Registration Codes**: Generated server-side using a PostgreSQL sequence (`registration_code_seq`) with format `REG-YYYY-NNNNNN` (e.g. `REG-2026-000125`).
- **Private Storage Isolation**: `registration_documents` only stores opaque storage keys (e.g. `private/docs/2026/...`), never permanent public URLs.

---

## 2. Table Directory

### 2.1 Academic Structure & Multi-School
| Table | Description | Primary Key | Key Constraints / Indexes |
|---|---|---|---|
| `schools` | Multi-school establishment profiles & geo | UUID | Unique `code`, Latitude/Longitude ranges |
| `academic_years` | School years & operational status | UUID | Unique partial index on `is_active_default = true` |
| `cycles` | Global educational cycles (Prep, Prim, Moy, Sec) | UUID | Unique `code`, `display_order` |
| `levels` | Global grade levels (1AP, 1AM, 1AS, etc.) | UUID | Unique `code`, FK `cycle_id` |
| `school_year_levels` | **Critical junction**: Level in School during Year | UUID | Unique `(school_id, academic_year_id, level_id)`, Check `capacity_max >= 0` |
| `tariffs` | Immutable fee structures per level-year | UUID | FK `school_year_level_id`, Check `amount >= 0` |

### 2.2 Dossiers & Registrations
| Table | Description | Primary Key | Key Constraints / Indexes |
|---|---|---|---|
| `parents` | Parent/guardian contact records | UUID | Index on `phone_primary` (multi-child safe) |
| `students` | Student identity & birth details | UUID | Index on `full_name`, `birth_date` |
| `registrations` | Core student admission dossier | UUID | Unique `registration_code`, Indexes on status, school, year, level |
| `registration_status_history` | Append-only status transition log | UUID | FK `registration_id`, Index on `created_at` |
| `registration_notes` | Admin-private internal review notes | UUID | FK `registration_id`, soft-deletable (`deleted_at`) |
| `waiting_list_entries` | Computed priority waiting queue | UUID | FK `registration_id`, FK `school_year_level_id`, Index on `entered_at` |

### 2.3 Documents & Media
| Table | Description | Primary Key | Key Constraints / Indexes |
|---|---|---|---|
| `document_types` | Master list of configurable file types | UUID | Unique `name_fr`, file rules, size limits |
| `school_level_document_requirements` | Rules per school/year/cycle/level | UUID | FKs to school, year, level, doc type |
| `registration_documents` | Versioned uploaded files (Private keys) | UUID | FK `registration_id`, FK `replaces_document_id`, Check `version_number >= 1` |
| `media_assets` | Public media with responsive keys & focal points | UUID | Type, category, focal point coords, check file size |
| `school_media_assignments` | Placements (Hero, Logo, Gallery) | UUID | FK `school_id`, FK `media_asset_id` |

### 2.4 Dynamic Form Builder
| Table | Description | Primary Key | Key Constraints / Indexes |
|---|---|---|---|
| `form_definitions` | Custom registration forms | UUID | Status lifecycle, versioning |
| `form_sections` | Stepper sections per form | UUID | FK `form_definition_id`, `display_order` |
| `form_fields` | Dynamic inputs with conditional logic & JSON validation | UUID | FK `form_section_id`, `is_system_protected` flag |
| `registration_custom_field_values` | Responses to custom form fields | UUID | FK `registration_id`, FK `form_field_id` |

### 2.5 RBAC, Security & Audit
| Table | Description | Primary Key | Key Constraints / Indexes |
|---|---|---|---|
| `users` | Administrative staff & agent accounts | UUID | Unique `email`, status, 2FA flag |
| `roles` | Predefined roles (`SUPER_ADMIN`, `ADMIN`, `AGENT`) | UUID | Unique `code` |
| `permissions` | 31+ granular action permissions | UUID | Unique `code` |
| `role_permissions` | Role to permission mappings | `(role_id, permission_id)` | Composite PK |
| `user_roles` | User to role assignments | `(user_id, role_id)` | Composite PK |
| `user_school_access` | Restricts Admin/Agent to specific schools | `(user_id, school_id)` | Composite PK |
| `user_level_access` | Optional level-specific scoping | `(user_id, level_id)` | Composite PK |
| `audit_logs` | Append-only system & user action audit trail | UUID | Indexes on `user_id`, `(entity_type, entity_id)`, JSON before/after |
| `login_events` | Security login/2FA/lockout tracking | UUID | Index on `user_id`, `created_at` |
| `user_sessions` | Application session state tracking | UUID | FK `user_id`, index on `last_activity_at` |

### 2.6 Communication, Content & Compliance
| Table | Description | Primary Key | Key Constraints / Indexes |
|---|---|---|---|
| `notifications` | In-app alerts with severity | UUID | Composite index `(user_id, is_read)` |
| `notification_preferences` | User preferences per notification channel | `user_id` | In-app, Email, WhatsApp, SMS flags |
| `system_settings` | Global and school-scoped configurations | UUID | Unique `(scope, school_id, key)` |
| `faq_items` | Multilingual FAQ questions and answers | UUID | Status index, display ordering |
| `contact_messages` | Inbound inquiries from public contact form | UUID | Status index, assignment to user |
| `public_content_blocks` | CMS content blocks for public pages | UUID | Unique `(page, section_key)` |
| `policy_versions` | Privacy, Terms, Cookie policy versions | UUID | Type, version, status index |
| `consent_records` | Parent consent tracking linked to registrations | UUID | FK `registration_id`, consent type |

---

## 3. Foreign Key Safety Policy

```
[schools] ───────────(RESTRICT)──────────> [registrations]
[schools] ───────────(RESTRICT)──────────> [school_year_levels]
[academic_years] ────(RESTRICT)──────────> [school_year_levels]
[levels] ────────────(RESTRICT)──────────> [school_year_levels]
[document_types] ────(RESTRICT)──────────> [registration_documents]

[registrations] ─────(CASCADE)───────────> [registration_status_history]
[registrations] ─────(CASCADE)───────────> [registration_documents]
[registrations] ─────(CASCADE)───────────> [registration_notes]
[registrations] ─────(CASCADE)───────────> [waiting_list_entries]
[registrations] ─────(CASCADE)───────────> [consent_records]

[users] ─────────────(SET NULL)──────────> [audit_logs.user_id]
[users] ─────────────(SET NULL)──────────> [registrations.assigned_user_id]
[users] ─────────────(CASCADE)───────────> [user_roles]
[users] ─────────────(CASCADE)───────────> [user_school_access]
```

---

## 4. Developer Workflows

### 4.1 Generate Migrations from Schema
Whenever schema files in `src/schema/` are modified:
```powershell
npm run db:generate --workspace=packages/database
```

### 4.2 Run Migrations
Applies all pending migrations to PostgreSQL:
```powershell
npm run db:migrate --workspace=packages/database
```

### 4.3 Seed Initial Data
Seeds academic year 2026/2027, 2 schools, 4 cycles, 14 levels, capacities, 6 document types, 3 roles, and 31 permissions:
```powershell
npm run db:seed --workspace=packages/database
```

### 4.4 Complete Dev Reset
Drops all tables, re-runs migrations, and re-seeds from scratch:
```powershell
npm run db:reset --workspace=packages/database
```

### 4.5 Inspect Tables (Drizzle Studio)
Launches the visual database browser on `https://local.drizzle.studio`:
```powershell
npm run db:studio --workspace=packages/database
```
