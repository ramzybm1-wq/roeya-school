# VISION SCHOOL - Waiting List Engine Specification

This document details the complete architecture and operational specifications for the **Waiting List Engine**, **FIFO Queue Management**, **Capacity-Released Alerts**, **Manual Promotion**, **Place Offers & Reservations**, **Skip/Reactivate Lifecycle**, and **Client Tracking Privacy** in VISION SCHOOL.

---

## 1. Core Architectural Principles

- **Independent Queues**: Waiting lists are strictly scoped per `school_year_level_id` ($\text{School} + \text{Academic Year} + \text{Grade Level}$). There is **no** single global waiting list.
- **Dynamic Rank Calculation**: Queue rank (#1, #2, #3...) is calculated dynamically on active eligible entries sorted by $\text{entered\_at ASC}$, and is never stored as mutable truth.
- **Manual Promotion Default**: When capacity is released ($\text{ACCEPTED} \rightarrow \text{CANCELLED}$), the system alerts school staff and presents the next candidate for **manual promotion**. No automatic acceptances occur by default.
- **Capacity Locking & Anti-Overbooking**: Promotions and reservations execute within atomic database transactions with row-level capacity locking to prevent race conditions.
- **Client Privacy**: Queue positions and candidate rankings are completely hidden from parents unless `show_waiting_position_client` is explicitly enabled.

---

## 2. Queue Lifecycle & Statuses

```
[Registration Full + Waitlist] ──> [ACTIVE Queue] ──(Skip)──> [SKIPPED_TEMPORARILY]
                                         │                               │
                                         │ (Reactivate) <────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
          [Direct Promotion]                          [Place Offer Flow]
                   │                                           │
                   ▼                                           ├──> [OFFERED (Pending)]
          [PROMOTED (Accepted)]                                │
                                                               ├──(Expire/Decline)──> [ACTIVE Queue]
                                                               └──(Accept)──────────> [PROMOTED (Accepted)]
```

### 2.1 Entry Statuses (`waiting_list_status`)
| Status | Active in Queue | Description |
|---|---|---|
| `ACTIVE` | ✅ Yes | Candidate is actively in queue and eligible for promotion or place offer. |
| `SKIPPED_TEMPORARILY` | ⚠️ In Queue, Ineligible | Candidate is on hold (e.g. unreachable, incomplete files) until `skipReviewAt` or manual reactivation. |
| `OFFERED` | ⚠️ In Queue, Ineligible | Candidate has an active pending place offer. |
| `PROMOTED` | ❌ No | Candidate has been formally accepted and promoted into the school roster. |
| `REMOVED` | ❌ No | Candidate was removed (e.g. parent declined, duplicate, wrong level). |
| `CANCELLED` | ❌ No | Parent or admin cancelled the underlying registration. |

---

## 3. Place Offers & Capacity Reservations

### 3.1 Temporary Reservation Model
When offering a place (`POST /api/admin/waiting-list/:id/offer`) with `reserveCapacity = true`:
1. The system verifies free capacity:
   $$\text{free\_reservable\_capacity} = \text{capacity\_max} - \text{accepted\_count} - \text{active\_reservations} > 0$$
2. An active reservation is created in `capacity_reservations` with an expiration timestamp (`expiresAt`).
3. The candidate entry status becomes `OFFERED`.

### 3.2 Offer Expiration
When `now > offer_expires_at`:
- The offer status becomes `EXPIRED`.
- The reservation is released (`status = 'EXPIRED'`, `releasedAt = now`).
- The candidate returns to `ACTIVE` queue status.

---

## 4. Concurrency & Capacity Protection

When promoting a candidate:
```sql
SELECT count(*) FROM registrations 
WHERE school_year_level_id = $1 AND status = 'ACCEPTED'
FOR UPDATE;
```
If $\text{accepted\_count} \ge \text{capacity\_max}$, the transaction aborts with `400 VALIDATION_ERROR` (`NO_AVAILABLE_PLACE`), preventing overbooking under simultaneous promotion requests.

---

## 5. API Reference Summary

### Admin Protected APIs (`/api/admin/waiting-list/*`)
- `GET /api/admin/waiting-list?schoolYearLevelId=...`: Get ordered queue items with computed ranks.
- `GET /api/admin/waiting-list/summary/:schoolYearLevelId`: Get level waiting summary card.
- `GET /api/admin/waiting-list/analytics`: Conversion rates and waiting duration metrics.
- `POST /api/admin/waiting-list/:id/promote`: Promote candidate to `ACCEPTED`.
- `POST /api/admin/waiting-list/:id/offer`: Create place offer with expiration date.
- `POST /api/admin/waiting-list/:id/skip`: Put candidate on hold temporarily.
- `POST /api/admin/waiting-list/:id/reactivate`: Reactivate skipped candidate.
- `POST /api/admin/waiting-list/:id/remove`: Remove candidate from waiting list.
- `POST /api/admin/waiting-list/transfer`: Transfer candidate to another level or establishment.

### Public Client Tracking API
- `GET /api/public/tracking/:token`: Returns status `WAITLISTED` with sanitized French/Arabic explanation. Numeric position is omitted unless `show_waiting_position_client = true`.
