# VISION SCHOOL - Dynamic Registration Form Builder Specification

This document details the complete technical architecture and operational specifications for the **Dynamic Registration Form Builder**, **Hierarchical Resolution**, **System-Protected Fields**, **Deterministic Conditional Logic Engine**, **Custom Fields**, and **Immutable Versioning** in VISION SCHOOL.

---

## 1. Form Resolution Hierarchy

When a parent loads the registration wizard, the form schema is dynamically resolved via a 3-tier fallback order:
1. **School-Specific Published Form** (for selected `school_id` and `academic_year_id`)
2. **Global Academic-Year Published Form** (for selected `academic_year_id`)
3. **Global Standard Default Form**

---

## 2. System-Protected Fields Safeguards

To prevent breaking registration dossiers and identity tracking, critical domain fields have `is_system_protected = true`. They **cannot** be deleted or converted to arbitrary unstructured types by school admins:
- `school_id` & `level_id`: Bound to database establishment and grade levels.
- `student_first_name_fr`, `student_last_name_fr`, `student_birth_date`, `student_gender`: Core student identity.
- `parent_first_name_fr`, `parent_last_name_fr`, `parent_phone`, `parent_address`: Core parent identity and tracking lookup key.

---

## 3. Structured Conditional Logic Engine

Conditional field visibility and conditional requirement rules use structured JSON logic. Arbitrary or executable JavaScript is strictly forbidden.

### 3.1 Schema Format
```json
{
  "operator": "AND",
  "conditions": [
    {
      "fieldKey": "uses_school_transport",
      "comparison": "EQUALS",
      "value": true
    }
  ]
}
```

### 3.2 Supported Comparisons
- `EQUALS` / `NOT_EQUALS`
- `IS_EMPTY` / `IS_NOT_EMPTY`
- `IN` / `NOT_IN`

---

## 4. Custom Fields & Response Storage

- Standard identity fields are stored directly in `parents`, `students`, and `registrations`.
- Extra dynamic fields (e.g. `uses_school_transport`, `transport_zone`, `dietary_needs`) are cleanly persisted in `registration_custom_field_values` linked to `(registration_id, form_field_id)`.

---

## 5. Versioning & Draft / Publish Workflow

```
[Live Client: Form v1 (PUBLISHED)] 
           │
     (Admin Edits)
           │
           ▼
[Admin Workspace: Form v2 (DRAFT)] ──(Preview)──> [Draft Preview Mode]
           │
      (Publish)
           │
           ▼
[Form v1 (ARCHIVED)] ──> [Live Client: Form v2 (PUBLISHED)]
```

- In-flight registration submissions record `form_definition_id` and `form_version` on the `registrations` record for historical fidelity.

---

## 6. API Reference Summary

### Public Form API (`/api/public/registration-form`)
- `GET /api/public/registration-form?schoolId=...&academicYearId=...&language=...`: Resolves active published form configuration.

### Admin Protected Form APIs (`/api/admin/forms/*`)
- `GET /api/admin/forms`: List form definitions.
- `POST /api/admin/forms`: Create blank form or clone existing version.
- `GET /api/admin/forms/:id`: Full form detail.
- `GET /api/admin/forms/:id/preview`: Authenticated draft preview.
- `POST /api/admin/forms/:id/publish`: Publish form version.
- `POST /api/admin/forms/sections/:sectionId/fields`: Add field.
- `DELETE /api/admin/forms/fields/:fieldId`: Delete field (with protected safeguard).
