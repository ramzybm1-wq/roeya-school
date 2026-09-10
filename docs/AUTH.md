# VISION SCHOOL - Admin Authentication & Authorization Specification

This document details the complete technical architecture and security specification for the **Admin Authentication, Roles, Permissions, School-Scoped Access, Sessions, 2FA, Invitations, Password Reset, and Security Events** in the VISION SCHOOL platform.

---

## 1. Core Principles

- **Admin-Only Scope**: Authentication applies strictly to staff members (`SUPER_ADMIN`, `ADMIN`, `AGENT`). Parents and students do not require an account to submit registrations or track applications.
- **Zero Public Signup**: Staff accounts can only be created or invited by an authorized administrator.
- **Cross-Platform Cryptography**: Utilizes Node.js standard `crypto` (PBKDF2-SHA512, RFC 6238 TOTP, SHA-256 token hashing) without third-party binary compilation issues on Windows.
- **Direct URL & Resource Protection**: Access to school-scoped resources (e.g., `/admin/inscriptions/:id`) is strictly authorized against the user's assigned schools, preventing cross-school data leaks.
- **Last Super Admin Safeguard**: The system strictly prevents demoting, disabling, suspending, or deleting the last active `SUPER_ADMIN`.
- **Enumeration Resistance**: Login and password reset endpoints return generic responses ("Adresse email ou mot de passe incorrect", "Si cette adresse correspond à un compte...") to prevent user discovery.

---

## 2. Roles & Permissions Matrix

### 2.1 Role Hierarchy
| Role | Scope | Description |
|---|---|---|
| `SUPER_ADMIN` | Global (All Schools) | Full platform control: Users, Roles, Security, Academic Years, Establishments, Settings, Audit. 2FA is **mandatory**. |
| `ADMIN` | Scoped to Assigned Schools | School manager: Inscriptions, Capacities, Tariffs, Documents, Media, Reports for their assigned establishment(s). |
| `AGENT` | Scoped to Assigned Schools | Front-office operator: View & update registrations, validate documents, consult school data. No user or settings management. |

### 2.2 Granular Permissions (31 Permissions)
| Category | Permission Codes |
|---|---|
| **Dashboard** | `dashboard.read` |
| **Registrations** | `registration.read`, `registration.create`, `registration.update`, `registration.accept`, `registration.refuse`, `registration.cancel`, `waiting_list.manage` |
| **Capacities & Tariffs** | `capacity.read`, `capacity.manage`, `tariff.read`, `tariff.manage` |
| **Documents & Media** | `document.read`, `document.validate`, `media.read`, `media.manage`, `media.publish` |
| **Establishments & Years** | `school.read`, `school.manage`, `academic_year.manage` |
| **Forms Builder** | `form.manage`, `form.publish` |
| **Reports & Analytics** | `report.read`, `report.export` |
| **Users & RBAC** | `users.read`, `users.manage`, `roles.manage` |
| **Security & Settings** | `security.read`, `security.manage`, `settings.manage`, `audit.read` |

---

## 3. Account Lifecycle & Security Flows

### 3.1 Staff Invitation Flow
```
[Admin] ──> POST /api/admin/users (Role + School IDs)
                │
                ├──> Creates User in `INVITED` status
                ├──> Generates 7-day secure token (`inv_...`)
                └──> Emits `USER_INVITED` audit event
                          │
[Invited User] ──> GET /api/admin/auth/invitation/:token (Validates token)
                │
                └──> POST /api/admin/auth/invitation/accept (Sets password & optional 2FA)
                          │
                          └──> User status becomes `ACTIVE` (Token invalidated)
```

### 3.2 Login & Progressive Lockout
- **Password Policy**: Minimum 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.
- **Lockout Policy**: After **5 consecutive failed attempts**, the account is locked for **15 minutes** (`lockedUntil`).
- **Generic Error**: "Adresse email ou mot de passe incorrect."

### 3.3 Two-Factor Authentication (2FA)
- **Algorithm**: RFC 6238 TOTP (HMAC-SHA1, 30s period, 6 digits) with $\pm 1$ step ($\pm 30\text{s}$) clock drift tolerance.
- **Mandatory Policy**: `SUPER_ADMIN` requires 2FA by platform policy.
- **Login Challenge**: Users with 2FA receive a short-lived challenge token (`2fa_ch_...`, 5-min expiry) upon password verification.
- **Recovery Codes**: 8 single-use alphanumeric codes (`xxxx-xxxx`), stored as SHA-256 hashes and consumed upon use.

### 3.4 Session Management
- **Idle Timeout**: 1 hour of inactivity.
- **Absolute Timeout**: 8 hours maximum session duration.
- **Storage**: `user_sessions` table stores `tokenHash` (SHA-256), `ipAddress`, `userAgent`, `deviceInfo`, and `lastActivityAt`.
- **Revocation**:
  - User can revoke other sessions from the Profile screen (`DELETE /api/admin/profile/sessions/:id`).
  - Super Admin can revoke any session from the Security screen (`DELETE /api/admin/security/sessions/:id`).
  - Changing password or account deactivation immediately revokes all active sessions.

---

## 4. Test Accounts (Development & Testing)

Default password for all test accounts: **`Password123!`**

| Role | Email | Name | Scope | 2FA |
|---|---|---|---|---|
| `SUPER_ADMIN` | `superadmin@visionschool.dz` | Nadia Bouzid | Global (All Schools) | Enabled (`JBSWY3DPEHPK3PXP`) |
| `ADMIN` | `admin.hydra@visionschool.dz` | Yasmine Mansouri | École A (Campus Hydra) | Configurable |
| `AGENT` | `agent.hydra@visionschool.dz` | Ali Kaci | École A (Campus Hydra) | Configurable |
| `AGENT` | `agent.elbiar@visionschool.dz` | Karim Hadj | École B (Campus El Biar) | Configurable |
