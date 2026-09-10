# VISION SCHOOL - Client Registration Tracking Specification

This document details the complete technical architecture and operational specifications for **Client Registration Tracking**, **Secure Dossier Lookup**, **Anti-Enumeration Safeguards**, **Public Status Mapping**, **Safe Timeline Generation**, **Document Replacement Actions**, and **Waiting List Privacy** in VISION SCHOOL.

---

## 1. No-Account Verification Model

Parents track their application without creating a permanent user account by verifying two credentials:
1. **Registration Code** (`REG-2026-000125`)
2. **Primary Parent Phone Number** (normalized Algerian number: `0550123456`)

```
[Parent Input: Code + Phone] ──> [Verification Endpoint]
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
             [Valid Match]                             [Invalid / Mismatch]
                   │                                           │
                   ▼                                           ▼
      [Signed Session Token]                      [Generic Error Message]
     (15-20 min validity)                       "Les informations saisies ne 
                                                permettent pas d’identifier 
                                                une demande."
```

---

## 2. Anti-Enumeration & Security Safeguards

- **Uniform Error Message**: Whether the code does not exist, the phone number is invalid, or the phone does not match the code, the system returns the **exact same generic error message**.
- **Rate Limiting**: Failed attempts are throttled per IP and code key (maximum 5 attempts per 15 minutes).
- **Short-Lived Scoped Sessions**: Verification issues an HMAC-SHA256 signed tracking session token strictly scoped to the verified `registration_id`.
- **Zero Sensitive Leaks**: Tracking responses strip internal notes, admin user IDs, audit events, refusal reasons, and document storage keys.

---

## 3. Public Status Mapping

| Internal Status | Public Status Key | French Label | Public Message |
|---|---|---|---|
| `NEW` | `REQUEST_RECEIVED` | Demande reçue | *Votre demande a bien été enregistrée et est en attente d’étude.* |
| `UNDER_REVIEW` | `UNDER_REVIEW` | En cours d’étude | *Votre dossier est actuellement en cours d’examen par l’équipe administrative.* |
| `PENDING` | `PENDING` | En attente de traitement | *Votre dossier est en cours de traitement.* |
| `ACCEPTED` | `ACCEPTED` | Demande acceptée | *Votre demande a été acceptée. L’établissement vous contactera afin de finaliser les démarches.* |
| `REFUSED` | `NOT_RETAINED` | Demande non retenue | *Votre demande n’a pas été retenue pour cette session.* |
| `WAITLISTED` | `WAITLISTED` | Liste d’attente | *Ce niveau est complet. Votre demande est positionnée sur liste d’attente.* |
| `CANCELLED` | `CANCELLED` | Demande annulée | *Cette demande a été annulée.* |

---

## 4. Public Timeline & Document Actions

### 4.1 Timeline Sanitization
- Formats status transitions into clean, parent-facing milestones.
- Completely omits staff identities, internal comments, and administrative notes.

### 4.2 Document Replacement Authorization
- If a document is marked `REPLACEMENT_REQUIRED` or `REJECTED`, the response sets `actionAllowed = 'REPLACE'`.
- Parents upload replacements directly through `POST /api/public/tracking/documents/:documentTypeId/replace` using their verified session token.
- The new file is saved as version $v+1$ with status `PENDING_REVIEW`.

---

## 5. Waiting List Position Privacy

- The numeric queue rank is returned **only** if `show_waiting_position_client = true` is configured for that grade level.
- Otherwise, `position` is returned as `null` while displaying a polite informational status message.

---

## 6. API Reference Summary

### Public Tracking APIs (`/api/public/tracking/*`)
- `POST /api/public/tracking/verify`: Authenticates code + phone $\rightarrow$ `{ trackingToken, expiresInSeconds }`.
- `GET /api/public/tracking/dossier`: Returns sanitized public dossier breakdown (`Authorization: Bearer <trackingToken>`).
- `POST /api/public/tracking/documents/:documentTypeId/replace`: Uploads replacement document within verified session.
- `POST /api/public/tracking/lost-dossier`: Safe lost dossier recovery request.
