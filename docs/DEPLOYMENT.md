# VISION SCHOOL — Guide et Spécification de Déploiement en Production

Ce document constitue la référence officielle pour le déploiement, la surveillance, la sécurisation et le rollback de la plateforme **VISION SCHOOL**.

---

## 1. Architecture de Production

| Composant | Technologie & Rôle | Domaine de Production | Directives de Sécurité |
|---|---|---|---|
| **Client Public** | Next.js / Vite Static SPA | `https://www.vision-school.dz` | HSTS, CSP, compression Brotli/Gzip, Cache-Control public sur médias, no-cache sur suivi. |
| **Console Admin** | Next.js / React Single Page App | `https://admin.vision-school.dz` | `no-store` sur toutes les requêtes privées, isolation 2FA obligatoire, sous-domaine dédié. |
| **API Backend** | Node.js Express / TypeScript | `https://api.vision-school.dz` | CORS restrictif (sans wildcard `*`), Rate Limiting par palier, logs sanitaires récursifs. |
| **Base de Données** | PostgreSQL 16+ Managé | `db.vision-school.internal` | TLS obligatoire (`sslmode=require`), pool de connexions (5-25), snapshots chiffrés AES-256. |
| **Stockage Privé** | S3 / MinIO Chiffré | Privé (sans accès anonyme) | URLs signées HMAC (15 min), isolation stricte des pièces justificatives PDF. |
| **Stockage Public** | S3 + CDN Cloudflare / Fastly | `https://media.vision-school.dz` | Logos, photos de campus, variantes responsive (WebP/AVIF), immutabilité par hash. |

---

## 2. Variables d'Environnement de Production (`.env.production`)

> [!WARNING]
> Aucun secret ne doit être commité dans le dépôt Git. Les variables ci-dessous doivent être configurées dans le Secret Manager de la plateforme d'hébergement (ex. Doppler, AWS Secrets Manager, Vault).

```env
# ─── Environnement Core ──────────────────────────────────────────────────────────
NODE_ENV=production
API_PORT=4000
API_HOST=0.0.0.0
API_URL=https://api.vision-school.dz
API_CORS_ORIGINS=https://www.vision-school.dz,https://admin.vision-school.dz

PUBLIC_APP_URL=https://www.vision-school.dz
ADMIN_APP_URL=https://admin.vision-school.dz

# ─── PostgreSQL Managé ──────────────────────────────────────────────────────────
DATABASE_URL=postgresql://vs_prod_app_user:PROD_SECURE_PASSWORD@prod-db.internal:5432/vision_school_prod?sslmode=require
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=25

# ─── Sécurité Authentification & Sessions ──────────────────────────────────────
AUTH_SECRET=PROD_LONG_HIGH_ENTROPY_HMAC_SECRET_KEY_MIN_64_CHARS_ABC123
AUTH_ACCESS_TOKEN_TTL=15m
AUTH_REFRESH_TOKEN_TTL=7d

# ─── Stockage d'Objets S3 (Privé / Public) ────────────────────────────────────
STORAGE_DRIVER=s3
STORAGE_S3_BUCKET=vision-school-prod-storage
STORAGE_S3_REGION=eu-west-3
STORAGE_S3_ACCESS_KEY=AKIA_PROD_ACCESS_KEY
STORAGE_S3_SECRET_KEY=PROD_SECRET_STORAGE_KEY_SECURE

# ─── Intégrations Externes ─────────────────────────────────────────────────────
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy_PROD_RESTRICTED_MAPS_KEY_DOMAIN_LOCKED

# ─── Paramètres Métier ─────────────────────────────────────────────────────────
DEFAULT_TIMEZONE=Africa/Algiers
DEFAULT_CURRENCY=DZD
DEFAULT_LOCALE=fr
ACTIVE_ACADEMIC_YEAR=2026/2027
```

---

## 3. Workflow de Migration & Amorçage Sécurisé

### 3.1 Exécution des Migrations
1. Réaliser un snapshot de sauvegarde de la base de données de production :
   ```bash
   pg_dump -h prod-db.internal -U vs_prod_admin -d vision_school_prod -Fc -f backup_pre_deploy_$(date +%Y%m%d_%H%M%S).dump
   ```
2. Appliquer les migrations Drizzle ORM sans drop de schéma destructif :
   ```bash
   npm run migrate
   ```

### 3.2 Amorçage du Premier Super Administrateur (Bootstrap)
- Ne jamais injecter de comptes avec des mots de passe en clair par défaut.
- Exécuter la commande de bootstrap dédiée pour inviter le Super-Admin autorisé :
   ```bash
   npm run bootstrap:admin -- --email="direction@vision-school.dz" --firstName="Directeur" --lastName="Général"
   ```
- Le Super-Admin configure son mot de passe unique et active son TOTP 2FA lors de sa première connexion.

---

## 4. Matrice des Tests de Fumée Post-Déploiement (Smoke Tests)

| # | Test de Fumée | Procédure de Validation | Résultat Attendu |
|---|---|---|---|
| **01** | **Sondes de Santé** | `curl -f https://api.vision-school.dz/health` et `/ready` | HTTP 200, statut `UP` / `READY` sans fuite de configuration interne. |
| **02** | **Headers de Sécurité** | Vérification via `curl -I https://api.vision-school.dz/health` | `Content-Security-Policy`, `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`. |
| **03** | **Client Public** | Navigation sur `https://www.vision-school.dz` | Chargement des visuels Stitch, sélecteur de campus, tarifs et places conformes aux règles de visibilité. |
| **04** | **Suivi Dossier Client** | Recherche avec code invalide puis téléphone erroné | Message générique uniforme (protection anti-énumération, pas de stack trace). |
| **05** | **Console Admin & 2FA** | Connexion Super-Admin sur `https://admin.vision-school.dz` | Exigence du code TOTP 2FA, chargement des métriques temps réel du dashboard. |
| **06** | **Isolation Multi-Campus** | Requête API avec compte restreint sur un autre campus | HTTP 403 `FORBIDDEN` immédiat sans fuite de données. |
| **07** | **Stockage Documents Privés** | Téléversement d'un PDF test | Stockage chiffré, URL signée temporaire de 15 min, URL publique directe bloquée. |
| **08** | **Exports & Protection Formules** | Génération d'un export CSV / Excel | Préfixes dangereux (`=`, `+`, `-`, `@`) échappés automatiquement, audit consigné. |
| **09** | **Google Maps** | Consultation des fiches campus | Clé restreinte aux domaines autorisés, chargement des coordonnées GPS réelles. |

---

## 5. Procédure de Rollback (Plan de Repli d'Urgence)

Si une anomalie bloquante est détectée post-déploiement :

1. **Bascule du Trafic Applicatif** :
   - Réorienter le trafic vers la release précédente `v0.9.x` via le reverse proxy / CDN.
2. **Restauration de la Base de Données (si migration non rétrocompatible)** :
   ```bash
   pg_restore -h prod-db.internal -U vs_prod_admin -d vision_school_prod --clean --if-exists backup_pre_deploy_XXXX.dump
   ```
3. **Purge des Caches CDN** :
   - Purger l'ensemble des caches Edge sur `www.vision-school.dz` et `admin.vision-school.dz`.
4. **Vérification d'Intégrité** :
   - Vérifier la reprise nominale du service via les sondes `/health` et `/ready`.
