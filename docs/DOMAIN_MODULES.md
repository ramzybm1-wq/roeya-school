# VISION SCHOOL - Domain Modules Specification

This document details the complete domain business logic for **Establishments (Schools)**, **Academic Years**, **Educational Cycles & Grade Levels**, **School-Year Level Configurations**, **Dynamic Capacity Management**, **Tariffs**, and **Public Safe APIs**.

---

## 1. Domain Entities & Architecture

```
[Academic Years] ──┐
[Schools] ─────────┼──> [School Year Levels] (Junction) <── [Levels] <── [Cycles]
                   │           │
                   │           ├──> [Tariffs] (Immutable revisions)
                   │           ├──> [Registrations] (Accepted count source)
                   │           └──> [Waiting List Entries]
```

### 1.1 Establishments (`schools`)
- Stores complete campus profiles, GPS coordinates (validated within $-90 \le \text{lat} \le 90$ and $-180 \le \text{lng} \le 180$), contact info, and operational status.
- Deactivating or archiving a school preserves all historical records, registrations, and documents.

### 1.2 Academic Years (`academic_years`)
- States: `DRAFT`, `PREPARING`, `ACTIVE`, `CLOSED`, `ARCHIVED`.
- Only **one** academic year may have `isActiveDefault = true` at any time (enforced via database partial unique index).
- Resolved dynamically by frontend clients via `/api/public/academic-year/active` (no hardcoding).

### 1.3 Cycles & Levels (`cycles`, `levels`)
- Global reference definitions: 4 standard cycles (Préparatoire, Primaire, Moyen, Secondaire) and 14 grade levels (PREP to 3AS).

### 1.4 School-Year Levels (`school_year_levels`)
- Central operational configuration connecting one grade level to one school during one academic year.
- Enforces unique composite constraint `(school_id, academic_year_id, level_id)`.

---

## 2. Dynamic Capacity Management

### 2.1 The Single Source of Truth Formula
Capacity remaining is **never** stored as mutable state. It is calculated dynamically:
$$\text{accepted\_count} = \text{COUNT}(\text{registrations WHERE school\_year\_level\_id} = X \text{ AND status} = \text{'ACCEPTED'})$$
$$\text{remaining\_places} = \max(0, \text{capacity\_max} - \text{accepted\_count})$$
$$\text{fill\_rate} = \frac{\text{accepted\_count}}{\text{capacity\_max}} \times 100$$

> [!IMPORTANT]
> Registrations in status `NEW`, `UNDER_REVIEW`, `PENDING`, `REFUSED`, `WAITLISTED`, or `CANCELLED` do **not** consume capacity.

### 2.2 Capacity Update Safeguard
Administrators cannot lower `capacity_max` below the number of already accepted students:
$$\text{new\_capacity\_max} \ge \text{accepted\_count}$$
Attempts to violate this rule are strictly blocked with `400 VALIDATION_ERROR`.

### 2.3 Derived Operational States
The system derives the operational availability state based on live conditions:
- **`NOT_STARTED`**: If server time is before `registration_open_at`.
- **`CLOSED`**: If `registration_open = false` or server time is after `registration_close_at`.
- **`FULL_WAITLIST`**: When $\text{accepted\_count} \ge \text{capacity\_max}$, `full_behavior = 'WAITLIST'`, and `waiting_list_enabled = true`.
- **`FULL`**: When capacity is reached and `full_behavior = 'CLOSE'`.
- **`NEAR_FULL`**: When $\text{fill\_rate} \ge \text{near\_full\_threshold}$ (default: 85%) and $< 100\%$.
- **`OPEN`**: Normal registration available.

---

## 3. Tariffs & Immutable Versioning

- **Amount Validation**: Fee amounts must be $\ge 0$.
- **Historical Immutability**: Updating a tariff does not destructively overwrite past pricing. The previous version is closed (`validTo = now`, `status = 'INACTIVE'`), and a fresh active revision is inserted.
- **Copying Tariffs to Next Year**: Supports percentage adjustments (e.g. $+5\%$) and fixed increments (e.g. $+2000\text{ DZD}$).

---

## 4. Public API Sanitization & Privacy

When public clients query `/api/public/schools/:schoolId/levels`:
- **Hidden Capacity**: If `show_remaining_places = false`, `capacity_max`, `accepted_count`, and `remaining_places` are stripped from the response.
- **Hidden Fill Rate**: If `show_fill_rate = false`, numeric `fill_rate` is stripped from the response.
- **Hidden Tariffs**: If `show_client = false`, the numeric amount is stripped and replaced with `hiddenClientMessageFr` or `"Tarif sur demande"`.

---

## 5. API Reference Summary

### Public APIs
- `GET /api/public/schools`: List active establishments.
- `GET /api/public/schools/:id`: Get active establishment details.
- `GET /api/public/academic-year/active`: Get currently active default academic year.
- `GET /api/public/schools/:schoolId/levels`: Get public sanitized levels and tariffs for a school.
- `GET /api/public/cycles`: Get educational cycles.

### Admin Protected APIs
- `GET /api/admin/schools`, `POST /api/admin/schools`, `PUT /api/admin/schools/:id`, `POST /api/admin/schools/:id/activate`, `POST /api/admin/schools/:id/deactivate`, `POST /api/admin/schools/:id/archive`
- `GET /api/admin/academic-years`, `POST /api/admin/academic-years`, `POST /api/admin/academic-years/:id/activate`, `POST /api/admin/academic-years/:id/close`, `POST /api/admin/academic-years/prepare-next-year`
- `GET /api/admin/school-year-levels`, `POST /api/admin/school-year-levels`, `POST /api/admin/school-year-levels/:id/open`, `POST /api/admin/school-year-levels/:id/close`, `PATCH /api/admin/school-year-levels/:id/capacity`
- `GET /api/admin/tariffs`, `POST /api/admin/tariffs`, `PUT /api/admin/tariffs/:id`, `POST /api/admin/tariffs/copy-to-year`, `POST /api/admin/tariffs/bulk-visibility`
- `GET /api/admin/dashboard/metrics`: Live capacity, level, and establishment KPI aggregations.
