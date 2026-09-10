# ROEYA SCHOOL — School Management & Registration Platform

A full-stack, bilingual (FR/AR) private school management platform for Algeria, covering student registration, document collection, admission tracking, and school administration.

---

## Table of Contents

- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Development](#development)
- [Production (Docker)](#production-docker)
- [Build](#build)
- [Project Structure](#project-structure)
- [Default Accounts](#default-accounts)
- [Deployment Notes](#deployment-notes)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     ROEYA SCHOOL                          │
├──────────────┬───────────────────────┬────────────────────┤
│  Client App  │     Admin Dashboard   │     Backend API    │
│  (Port 3000) │      (Port 3001)      │    (Port 4000)     │
│  Express/EJS │     Express/EJS       │  Express/TypeScript│
└──────┬───────┴──────────┬────────────┴────────┬───────────┘
       │                  │                     │
       └──────────────────┴─────────────────────┤
                                                │
                              ┌─────────────────▼──────────┐
                              │    PostgreSQL 16 Database   │
                              │     (Drizzle ORM)          │
                              └────────────────────────────┘
```

### Monorepo Structure — npm Workspaces

| Package | Path | Description |
|---|---|---|
| `@vision-school/api` | `apps/api` | REST API backend |
| `@vision-school/client` | `apps/client` | Public registration portal |
| `@vision-school/admin` | `apps/admin` | Admin management dashboard |
| `@vision-school/database` | `packages/database` | Drizzle ORM schema + migrations |
| `@vision-school/shared` | `packages/shared` | Shared types, errors, utilities |
| `@vision-school/auth` | `packages/auth` | Authentication & authorization |
| `@vision-school/config` | `packages/config` | Environment configuration |
| `@vision-school/validation` | `packages/validation` | Input validation schemas |
| `@vision-school/ui-shared` | `packages/ui-shared` | Shared UI helpers |
| `@vision-school/storage` | `storage` | File storage abstraction |

---

## Requirements

- **Node.js** ≥ 20
- **npm** ≥ 10
- **PostgreSQL** 16 (or Docker)
- **Docker & Docker Compose** (recommended for production)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/roeya-school.git
cd roeya-school

# Install all workspace dependencies
npm install
```

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

See [`.env.example`](.env.example) for all required variables with descriptions.

> ⚠️ **Never commit `.env` or any file containing real credentials.**

### Required Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | JWT/session signing key (min 64 chars) |
| `PUBLIC_APP_URL` | Client portal URL |
| `ADMIN_APP_URL` | Admin dashboard URL |
| `API_URL` | Backend API URL |
| `API_CORS_ORIGINS` | Comma-separated allowed origins |

### Optional Variables

| Variable | Description |
|---|---|
| `STORAGE_DRIVER` | `local` (default) or `s3` |
| `STORAGE_S3_*` | S3 credentials (production only) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps embed key |
| `SMTP_*` | Email provider (for notifications) |

---

## Database Setup

### Auto-Migration (Recommended)

The API runs migrations automatically on startup via the built-in auto-migrator.

### Manual Migration

```bash
# Run migrations manually
npm run migrate --workspace=packages/database

# Seed reference data (levels, cycles, permissions)
npm run seed --workspace=packages/database
```

### Reset (Development Only — ⚠️ Destroys all data)

```bash
npm run reset --workspace=packages/database
```

---

## Development

```bash
# Start all services in parallel (API + Client + Admin)
npm run dev

# Or start individually
npm run dev:api       # Backend API on :4000
npm run dev:client    # Client portal on :3000
npm run dev:admin     # Admin dashboard on :3001
```

> **Prerequisite:** PostgreSQL must be running locally, and `.env` must be configured.

---

## Production (Docker)

### 1. Configure Secrets

```bash
# Copy and fill in the override file
cp docker-compose.override.yml.example docker-compose.override.yml
# Edit docker-compose.override.yml with your real passwords/secrets
```

### 2. Build & Start

```bash
docker compose up -d --build
```

### 3. Verify

```bash
docker compose ps
curl http://localhost:4000/health
```

**Default ports:**

| Service | URL |
|---|---|
| 🌐 Client Registration Portal | http://localhost:3000 |
| 🔧 Admin Dashboard | http://localhost:3001 |
| ⚙️ Backend API | http://localhost:4000 |
| 💚 Health Check | http://localhost:4000/health |
| 🗄️ PostgreSQL | localhost:5432 |

---

## Build

```bash
# Typecheck all workspaces
npm run typecheck

# Run tests
npm run test

# Build all
npm run build
```

---

## Project Structure

```
roeya-school/
├── apps/
│   ├── api/                  # Backend REST API
│   │   ├── src/
│   │   │   ├── routes/       # Public & Admin route handlers
│   │   │   ├── services/     # Business logic services
│   │   │   ├── middleware/   # Auth, RBAC, security
│   │   │   └── server.ts     # Express server setup
│   │   └── Dockerfile
│   ├── client/               # Public registration portal
│   │   ├── src/
│   │   │   ├── components/   # UI components
│   │   │   ├── pages/        # Page templates
│   │   │   └── styles/       # CSS stylesheets
│   │   └── Dockerfile
│   └── admin/                # Admin management dashboard
│       ├── src/
│       │   ├── components/   # Admin UI components
│       │   ├── pages/        # Admin page templates
│       │   └── auth/         # Admin authentication
│       └── Dockerfile
├── packages/
│   ├── database/             # Drizzle ORM — schema, migrations, seed
│   ├── shared/               # Shared types, errors, API response helpers
│   ├── auth/                 # Authentication service & JWT logic
│   ├── config/               # Environment config loader
│   ├── validation/           # Input validation (Zod schemas)
│   └── ui-shared/            # Shared UI utilities
├── storage/                  # File storage abstraction layer
│   ├── private-documents/    # (gitignored — runtime uploads)
│   └── public-media/         # (gitignored — runtime media)
├── docker-compose.yml        # Production Docker orchestration
├── docker-compose.override.yml.example  # Local dev overrides template
├── .env.example              # Environment variables template
├── tsconfig.base.json        # Shared TypeScript configuration
└── package.json              # Monorepo root (npm workspaces)
```

---

## Default Accounts

> These accounts are created by the database seeder with a **default development password**.
> **Change all passwords before any production use.**

| Role | Email | Notes |
|---|---|---|
| Super Admin | `superadmin@visionschool.dz` | Has 2FA enabled |
| Admin (Hydra) | `admin.hydra@visionschool.dz` | No 2FA |
| Agent | `agent.hydra@visionschool.dz` | Limited access |

Default seed password: `Password123!` *(development only — change in production)*

---

## Registration Flow

The client registration portal guides parents through a 5-step wizard:

1. **Établissement** — School selection
2. **Élève** — Student information
3. **Parent/Tuteur** — Parent/guardian information
4. **Documents** — Document upload (configurable via Admin Form Builder)
5. **Confirmation** — Summary and submission

---

## Admin Features

- 📋 **Registrations** — Full registration lifecycle management
- 🏫 **Schools & Levels** — Multi-campus, cycle/level management
- 📝 **Form Builder** — Configurable registration form fields per step
- 📄 **Documents** — Document type configuration, validation, review
- 💰 **Tariffs** — Fee configuration per level/academic year
- 📊 **Reports & Exports** — Registration reports and data exports
- 👥 **User Management** — Role-based access control (RBAC)
- ⚙️ **Settings** — Branding, contact info, academic year, maps
- 🔒 **Security** — Audit logs, session management, 2FA support

---

## Deployment Notes

### Vercel / Cloud Deployment

This project is designed to deploy via:

```
GitHub Repository → Vercel (or any Node.js hosting)
```

Set all environment variables from `.env.example` in your hosting provider's dashboard.

### PostgreSQL

Use a managed PostgreSQL service (Neon, Supabase, Railway, AWS RDS) for production.

### Storage

For production file uploads, configure S3-compatible storage:
```
STORAGE_DRIVER=s3
STORAGE_S3_BUCKET=your-bucket
STORAGE_S3_REGION=eu-west-3
STORAGE_S3_ACCESS_KEY=...
STORAGE_S3_SECRET_KEY=...
```

---

## License

UNLICENSED — Private project. All rights reserved by ROEYA SCHOOL.