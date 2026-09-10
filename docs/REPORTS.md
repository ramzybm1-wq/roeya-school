# VISION SCHOOL - Reports & Export Engine Specification

This document details the complete technical architecture and operational specifications for the **Reporting Engine**, **Multi-Format Exporters (Excel, CSV, PDF, Print View)**, **Formula-Injection Sanitization**, **Academic Year & School Comparisons**, **Saved Reports**, and **Export Auditing** in VISION SCHOOL.

---

## 1. Report Types & Prebuilt Templates

The reporting engine provides built-in templates and a custom report builder:
- `REGISTRATIONS_GLOBAL`: Complete overview of all submitted dossiers across cycles and levels.
- `ACCEPTED_REGISTRATIONS`: Official roster of accepted students.
- `REFUSED_REGISTRATIONS`: List of non-retained dossiers.
- `PENDING_REGISTRATIONS`: In-flight dossiers requiring review.
- `WAITING_LIST`: Chronological FIFO queue with position tracking and offer history.
- `CAPACITY_BY_LEVEL`: Class capacity, accepted registrations, remaining seats, and fill rates.
- `LEVEL_PERFORMANCE`: Demand analysis and conversion rates by grade level.
- `SCHOOL_PERFORMANCE`: Comparative enrollment statistics between campuses.
- `DOCUMENT_STATUS`: Aggregated completeness and verification progress.
- `INCOMPLETE_DOSSIERS`: Applications missing mandatory pieces of evidence.
- `TARIFFS`: Official tariff grid with explicit theoretical calculation disclaimer.
- `ACADEMIC_YEAR_COMPARISON`: Year-over-year comparative analysis (e.g. 2025/2026 vs 2026/2027).
- `ANNUAL_MANAGEMENT_REPORT`: High-level institutional synthesis.

---

## 2. Business Metric Consistency

Reports reuse the canonical formulas established in the platform:
- **Remaining Capacity**: Derived strictly from `Capacity - Accepted Dossiers` (never from total submitted requests).
- **Fill Rate**: $\frac{\text{Accepted Dossiers}}{\text{Class Capacity}} \times 100$.
- **No Revenue Claims**: Tariffs are labeled as *"Montant théorique selon les tarifs"* and never represented as collected revenue without a real payment gateway.

---

## 3. Multi-Format Exporters

### 3.1 CSV Export (RFC 4180)
- Encoded in UTF-8 with Byte Order Mark (BOM) for compatibility with Microsoft Excel.
- Semicolon (`;`) delimiter.
- **Formula-Injection Protection**: Any cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is escaped with a leading single quote (`'`).

### 3.2 Excel Export (`.xlsx`)
- Structured multi-sheet workbook:
  - **Résumé**: KPI summary cards, generation timestamp, disclaimer note.
  - **Données**: Formatted data table with frozen header row.
  - **Filtres**: Applied filter parameters.

### 3.3 Management PDF & Print View
- Includes Vision School header branding, KPI summary tiles, active filter badges, paginated table rows, and page numbers.

---

## 4. Column Whitelist & Personal Data Protection

| Column Key | Label | Access Control |
|---|---|---|
| `registrationCode` | Code Dossier | Standard |
| `studentFullName` | Élève (Nom & Prénom) | Standard |
| `studentBirthDate` | Date de naissance | Standard |
| `studentGender` | Sexe | Standard |
| `schoolName` | Établissement | Standard |
| `cycleName` | Cycle | Standard |
| `levelName` | Niveau demandé | Standard |
| `academicYearName` | Année scolaire | Standard |
| `status` | Statut | Standard |
| `submittedAt` | Date de dépôt | Standard |
| `parentFullName` | Parent / Tuteur | Sensitive |
| `parentPhone` | Téléphone Parent | Sensitive (Masked for Agents) |
| `parentEmail` | Email Parent | Sensitive (Masked for Agents) |
| `parentAddress` | Adresse | Sensitive |

> [!NOTE]
> System secrets, passwords, 2FA recovery codes, and signed private document URLs are strictly excluded from all export formats.

---

## 5. Saved Reports & Export Auditing

- **Permission Revalidation**: Opening a saved report re-evaluates the user's current school authorizations dynamically. A user whose school access was revoked cannot bypass permissions via a saved report.
- **Audit Logging**: Every export logs a `REPORT_EXPORTED` event in `audit_logs` and records the request in `report_exports`.

---

## 6. API Reference Summary

### Admin Report APIs (`/api/admin/reports/*`)
- `POST /api/admin/reports/preview`: Generates paginated report preview with summary KPIs.
- `POST /api/admin/reports/export`: Generates downloadable Excel, CSV, or PDF export.
- `GET /api/admin/reports/print`: Returns printable HTML view.
- `GET /api/admin/reports/saved` & `POST /api/admin/reports/saved`: Saved report configurations.
- `GET /api/admin/reports/exports`: List user's export history.
