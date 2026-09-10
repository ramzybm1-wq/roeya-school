# VISION SCHOOL - Security Hardening & Production Safety Specification

This document details the complete **Threat Model**, **Access Control Policies**, **Rate Limiting Matrix**, **Security Headers & CSP**, **Upload Safeguards**, **Log Sanitization**, **Backup & Disaster Recovery Procedures**, and **Incident Response Playbook** for VISION SCHOOL.

---

## 1. Threat Model & Mitigation Matrix

| Threat Category | Potential Risk | Architectural Safeguards |
|---|---|---|
| **Credential Attacks & Brute Force** | Password guessing / 2FA brute force | Scrypt hashing, account lockout (5 attempts / 15m), TOTP rate limiting, single-use hashed recovery codes. |
| **Broken Access Control & IDOR** | Accessing records across campuses | Server-side `AuthGuard.canAccessSchool` enforced on every domain query; resource ID verified against user permissions. |
| **SQL Injection** | Data leakage via unescaped queries | 100% parameterized Drizzle ORM queries; whitelisted sort/column keys. |
| **Cross-Site Scripting (XSS)** | Malicious script execution | Input sanitization on rich/public text, Content-Security-Policy (CSP), and React JSX auto-escaping. |
| **Cross-Site Request Forgery (CSRF)** | Unauthorized state mutations | SameSite cookie attributes, custom headers (`X-Requested-With`), and strict CORS origin validation. |
| **CORS Abuse** | Malicious third-party origin access | Explicit origin allowlist; no wildcard (`*`) origins on credentialed routes. |
| **File Upload Abuse & Path Traversal** | Executable uploads / path traversal | Magic byte validation (`%PDF-`), filename sanitization, UUID-based private storage keys, and no anonymous read access. |
| **Tracking Enumeration** | Determining if a dossier exists | Uniform generic error message on invalid code or phone mismatch; rate limiting per IP. |
| **Formula-Injection (CSV/Excel)** | Remote code execution in spreadsheets | Automatic escaping with leading single quote (`'`) on any string starting with `=`, `+`, `-`, `@`. |
| **Concurrency & Overbooking** | Race condition on last available place | Atomic database transactions and strict capacity verification before acceptance. |

---

## 2. Tiered Rate Limiting Matrix

| Endpoint / Operation | Window | Maximum Attempts | Action on Exceeded |
|---|---|---|---|
| **Admin Login** (`/api/admin/auth/login`) | 15 Minutes | 5 | 429 Too Many Requests & account lock |
| **2FA Verification** (`/api/admin/auth/2fa/verify`) | 10 Minutes | 5 | 429 Too Many Requests |
| **Tracking Verification** (`/api/public/tracking/verify`) | 15 Minutes | 5 | 429 Too Many Requests |
| **Contact Form** (`/api/public/contact`) | 10 Minutes | 5 | 429 Too Many Requests |
| **Public Registration** (`/api/public/registrations`) | 1 Hour | 10 | 429 Too Many Requests |
| **General Admin APIs** (`/api/admin/*`) | 1 Minute | 120 | 429 Too Many Requests |

---

## 3. Security Headers & Content-Security-Policy

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://maps.googleapis.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 4. Log & Audit Sanitization Rules

The `sanitizeLogObject` helper recursively redacts sensitive keys prior to logging or storing in `audit_logs`:
- **Redacted Keys**: `password`, `passwordHash`, `totpSecret`, `recoveryCode`, `recoveryCodes`, `token`, `refreshToken`, `accessToken`, `secret`, `authorization`, `cookie`, `signedUrl`, `privateKey`, `buffer`, `fileBuffer`, `apiKey`, `sessionToken`.

---

## 5. Backup & Disaster Recovery Procedures

### 5.1 Automated Snapshots
- **Database**: PostgreSQL daily automated snapshots at 03:00 UTC (AES-256 encrypted, 30-day retention).
- **Private Storage**: Real-time multi-region replication of private student PDFs and public media.

### 5.2 Restore Verification
- Restore operations require Super Admin authorization and must be tested in an isolated staging environment before production execution.

---

## 6. Incident Response Playbook

1. **Compromised Admin Account**:
   - Immediately disable user status (`status: 'SUSPENDED'`).
   - Call `AdminSessionService.revokeAllUserSessions(userId)` to invalidate active tokens.
2. **Secret Rotation**:
   - Update `JWT_SECRET`, `TRACKING_SESSION_SECRET`, or `STORAGE_HMAC_SECRET` in environment.
   - Restart API instances.
3. **Emergency Registration Pause**:
   - Toggle `is_registration_open = false` on active academic year or specific grade levels.
