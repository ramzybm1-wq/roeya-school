# VISION SCHOOL - Private Document Storage & Requirements Specification

This document details the complete technical architecture and operational specifications for **Private Student Registration Document Storage**, **Document Requirements Hierarchy**, **Client Uploads & Versioning**, **Admin Review Queue**, **Signed Temporary URLs**, and **Dossier Completeness Rules** in VISION SCHOOL.

---

## 1. Core Security & Storage Architecture

- **Strict Privacy Isolation**: Student registration documents are strictly **PRIVATE**.
  - They are stored separately from public marketing media.
  - Stored in the private storage tier with generated object keys:
    `private/registrations/{registrationId}/documents/{documentTypeId}/v{version}.pdf`
  - Zero permanent public URLs exist in the database or API responses.
- **HMAC-SHA256 Signed Temporary URLs**: Access for preview or download is granted via short-lived signed tokens with a default **15-minute expiration** (900 seconds).

---

## 2. Document Requirements Hierarchy

Requirements are resolved with a deterministic 3-tier precedence:
$$\text{Level Specific} > \text{Cycle Specific} > \text{School Global}$$

### 2.1 Default Policy
- All documents are **OPTIONAL** by default.
- A document becomes mandatory only when explicitly configured with `is_required = true`.
- `block_submission_if_missing` (default `false`): If `true`, parents cannot complete initial online submission without the file; if `false`, the registration can be submitted and completed later.

---

## 3. Upload & Immutable Versioning Workflow

```
[Initial Upload] ──> Version 1 (Status: PENDING_REVIEW)
                           │
                           ├──(Validate)──────> Version 1 (Status: VALIDATED)
                           │
                           └──(Replacement)───> Version 1 (Status: REPLACEMENT_REQUIRED)
                                                      │
                                                      └── [Parent Uploads Replacement]
                                                                │
                                                                └──> Version 2 (Status: PENDING_REVIEW)
                                                                     (replaces_document_id = Version 1)
```

> [!IMPORTANT]
> Uploading a replacement **never** mutates or deletes previous versions. Version 1 is preserved in the database for auditing and historical review.

---

## 4. Admin Review Workflow & Statuses

- **`VALIDATED`**: The document has been checked and verified by an authorized staff member.
- **`REJECTED`**: The document is non-compliant, recording an internal reason code:
  - `UNREADABLE`: Document illegible or cut off.
  - `INCOMPLETE`: Missing required pages.
  - `WRONG_DOCUMENT`: Uploaded file does not match required document type.
  - `EXPIRED`: Document expired.
  - `INVALID_INFORMATION`: Identity or data mismatch.
- **`REPLACEMENT_REQUIRED`**: The document requires re-upload by the parent, with a parent-facing instruction message (e.g. *"Merci de fournir une copie scannée plus nette."*).

---

## 5. Dossier Completeness & Acceptance Safeguard

### 5.1 Completeness Formula
$$\text{isComplete} = (\text{missingRequiredCount} = 0) \land (\text{pendingRequiredCount} = 0) \land (\text{replacementRequiredCount} = 0)$$

- A dossier is complete when all mandatory documents are `VALIDATED`.
- Missing optional documents **never** count against completeness.

### 5.2 Registration Acceptance Guard
- `RegistrationService.accept()` validates that mandatory documents are complete.
- Incomplete dossiers cannot be accepted unless explicitly overridden by a Super Admin (`registration.accept.override_documents`) with audit reason recording.

---

## 6. API Reference Summary

### Public APIs (`/api/public/documents/*`)
- `GET /api/public/documents/requirements?schoolYearLevelId=...`: Public requirements for registration wizard.
- `POST /api/public/documents/tracking/:token/replace/:documentTypeId`: Parent replacement upload for tracking session.
- `GET /api/public/documents/secure-stream/:signedToken`: Temporary binary streaming for previews/downloads.

### Admin Protected APIs (`/api/admin/documents/*`)
- `GET /api/admin/documents/review-queue`: Review queue of pending documents.
- `GET /api/admin/documents/:id`: Document detail with full version history chain.
- `POST /api/admin/documents/:id/preview-url`: Generate temporary signed preview URL (15 mins).
- `POST /api/admin/documents/:id/download-url`: Generate temporary signed download URL (15 mins).
- `POST /api/admin/documents/:id/validate`: Validate document.
- `POST /api/admin/documents/:id/reject`: Reject document with reason code.
- `POST /api/admin/documents/:id/request-replacement`: Request replacement with parent message.
- `GET /api/admin/documents/completeness/:registrationId`: Dossier document completeness breakdown.
