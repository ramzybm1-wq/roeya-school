# VISION SCHOOL - Public Media Manager & Responsive Delivery Specification

This document details the complete technical architecture and operational specifications for the **Public Media Manager**, **Independent Multi-Surface Logo Management**, **Responsive Device Variants (Desktop / Tablet / Mobile)**, **Focal Point Engine**, **Draft / Publish Lifecycle**, **Version History**, and **Public Gallery Delivery** in VISION SCHOOL.

---

## 1. Core Architectural Separation

- **100% Isolation from Private Student PDFs**:
  - Public marketing media is stored in `public/media/{mediaId}/...` and served with public caching headers (`Cache-Control: public, max-age=86400`).
  - Private student registration documents remain strictly in `private/registrations/...` and require authorized HMAC-SHA256 signed temporary URLs.
  - Zero private documents are exposed through media endpoints.

---

## 2. Media Types & Placement Assignments

### 2.1 Media Types (`media_type`)
- `LOGO`: Transparent brand marks (rendered with `contain`, no crop).
- `HERO`: Header banners and homepage visual intros (rendered with `cover` and focal point).
- `BACKGROUND`: Full-bleed page backgrounds.
- `GALLERY`: Campus, facilities, and activity photos.
- `ICON`: UI marks and app badges.
- `OTHER`: General purpose visual assets.

### 2.2 Surface Placements (`media_placement`)
- `CLIENT_HEADER_LOGO` & `CLIENT_FOOTER_LOGO`: Public website header and footer.
- `ADMIN_SIDEBAR_LOGO` & `ADMIN_LOGIN_LOGO`: Admin dashboard sidebar and authentication pages.
- `ADMIN_LOGIN_BACKGROUND`: Background image for admin login.
- `APP_LOGO` & `APP_SPLASH`: Mobile application branding.
- `FAVICON`: Browser tab icon.
- `CLIENT_HERO`: School-specific or global homepage hero image.
- `CLIENT_GALLERY`: Public photo gallery.

---

## 3. Responsive Variants & Fallback Resolution

```
[Requested Screen: Desktop] ──> desktop_asset_key || original_asset_key
[Requested Screen: Tablet]  ──> tablet_asset_key  || desktop_asset_key || original_asset_key
[Requested Screen: Mobile]  ──> mobile_asset_key  || tablet_asset_key  || original_asset_key
```

When dedicated mobile/tablet variants are omitted, the system falls back to the original image and applies the **normalized focal point** ($0.0 \le x, y \le 1.0$) to calculate CSS `object-position: {focalX}% {focalY}%`.

---

## 4. Lifecycle & Delete Safeguards

- **`DRAFT` (Default)**: Newly uploaded images are in draft mode and hidden from public endpoints.
- **`PUBLISHED`**: Asset is live and returned by public APIs.
- **`INACTIVE` / `ARCHIVED`**: Asset is removed from public surfaces while preserving version history.
- **In-Use Delete Protection**: Actively assigned media (`school_media_assignments`) cannot be hard deleted without unassigning or archiving first.

---

## 5. API Reference Summary

### Public APIs (`/api/public/media/*`)
- `GET /api/public/media/branding?schoolId=...`: Resolves active logos, favicon, and login backgrounds.
- `GET /api/public/media/placement/:placement?schoolId=...`: Resolves responsive asset for a placement slot.
- `GET /api/public/media/gallery?schoolId=...&category=...&isFeatured=...`: Returns published gallery items.
- `GET /api/public/media/stream/*`: Streams public visual assets with caching.

### Admin Protected APIs (`/api/admin/media/*`)
- `GET /api/admin/media`: Filtered media library.
- `POST /api/admin/media`: Upload asset with original and optional device variants.
- `PATCH /api/admin/media/:id/focal-point`: Update focal point coordinates.
- `POST /api/admin/media/:id/publish` & `POST /api/admin/media/:id/unpublish`: Publish/unpublish.
- `POST /api/admin/media/:id/replace`: Upload replacement version.
- `POST /api/admin/media/:id/assign`: Assign asset to placement/school.
- `DELETE /api/admin/media/:id`: Delete asset with in-use protection.
