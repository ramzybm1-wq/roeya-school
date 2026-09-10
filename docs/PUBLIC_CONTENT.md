# VISION SCHOOL - Public Website Content, Contact & FAQ Specification

This document details the complete technical architecture and operational specifications for **Dynamic Public Content Management**, **Homepage API**, **School Presentation ("Notre École")**, **Values & Facilities Catalog**, **Public Announcements Scheduling**, **Structured Opening Hours & Live Open Status**, **Contact Form Handling**, and **Searchable Multilingual FAQs** in VISION SCHOOL.

---

## 1. Content Resolution Hierarchy

All public client interfaces dynamically resolve copy from `public_content_blocks`, `schools`, `faq_items`, `media_assets`, and `school_year_levels` via a 3-tier fallback order:
1. **School-Specific Published Content** (for selected `school_id`)
2. **Global Published Content** (`school_id IS NULL`)
3. **Safe UI Built-in Default Text**

> [!NOTE]
> Content in `DRAFT`, `INACTIVE`, or `ARCHIVED` status is never exposed on public endpoints.

---

## 2. Homepage Composite API (`GET /api/public/home`)

Returns an optimized, batched JSON payload containing:
- **Branding**: Logos, header/footer assets, login background.
- **Active Academic Year**: Current school year name and registration open/closed status.
- **Hero Banner**: Headline, subtitle, and CTA destination.
- **Announcement Banner**: Active scheduled banner (validated against server time).
- **Institutional Values**: 3 core values (Excellence Académique, Épanouissement, Innovation).
- **Active Cycles & School Cards**: Campuses with public contact info.
- **Featured Gallery Preview**: Up to 6 curated images.

---

## 3. School Presentation & Live Open Status (`GET /api/public/schools/:id/presentation`)

- **"Notre École" Modules**: Educational approach, values, campus facilities (salles connectées, laboratoires, espaces sportifs, restauration).
- **Structured Opening Hours & Live Calculation**:
  - Weekly schedule (`SUNDAY` through `SATURDAY`).
  - Calculates real-time status (`OPEN`, `CLOSED`, `UNKNOWN`) in the **`Africa/Algiers`** timezone (UTC+1).
- **Google Maps & Contacts**: Formatted with school's public visibility toggles (`isPhonePublic`, `isEmailPublic`, `isWhatsappPublic`, `isMapPublic`).

---

## 4. Contact Form & Anti-Spam (`POST /api/public/contact`)

- **Whitelisted Subjects**: `REGISTRATION`, `TARIFF`, `DOCUMENTS`, `LEVELS`, `SCHOOL_VISIT`, `OTHER`.
- **Anti-Spam Rate Limiting**: Max 5 submissions per 10 minutes per IP.
- **Sanitization**: Automatic HTML/script character escaping.
- **School Scoping**: Admin inbox routes messages by assigned campus.

---

## 5. Multilingual Searchable FAQ Engine (`GET /api/public/faq`)

- Filters by `schoolId`, `category` (`INSCRIPTION`, `DOCUMENTS`, `LISTE_ATTENTE`, `SERVICES`), and keyword `search`.
- Searches question, answer, and keywords in both **French** and **Arabic**.
- Automatically falls back to French when Arabic translation is absent.
- **Zero Sensitive Data Leaks**: Does not expose private capacity counts or hidden tariffs.

---

## 6. API Reference Summary

### Public Content APIs (`/api/public/*`)
- `GET /api/public/home`: Homepage composite payload.
- `GET /api/public/schools/:schoolId/presentation`: School presentation.
- `POST /api/public/contact`: Contact form submission.
- `GET /api/public/faq`: Searchable public FAQs.

### Admin Content APIs (`/api/admin/*`)
- `GET /api/admin/contact-messages`: List incoming contact messages with school scoping.
- `PATCH /api/admin/contact-messages/:id`: Update message status & assignment.
- `POST /api/admin/faq`: Create new FAQ item.
