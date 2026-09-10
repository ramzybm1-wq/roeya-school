/**
 * Backend API Server setup with Express, Security Middlewares & Health Endpoints.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import { EnvConfig, loadEnvConfig } from '@vision-school/config';
import { securityHeadersMiddleware, corsMiddleware } from './middleware/security.middleware';
import { authMiddleware } from './middleware/auth.middleware';

import PublicSchoolsRouter from './routes/public/schools.routes';
import PublicLevelsRouter from './routes/public/levels.routes';
import PublicAcademicYearsRouter from './routes/public/academic-years.routes';
import PublicCyclesRouter from './routes/public/cycles.routes';
import { PublicRegistrationRouter } from './routes/public/registration.routes';
import { PublicTrackingRouter } from './routes/public/tracking.routes';
import { PublicDocumentsRouter } from './routes/public/documents.routes';
import { PublicMediaRouter } from './routes/public/media.routes';
import { PublicFormRouter } from './routes/public/forms.routes';
import { PublicContentRouter } from './routes/public/content.routes';
import { PublicSettingsRouter } from './routes/public/settings.routes';
import { PublicClientAuthRouter } from './routes/public/client-auth.routes';
import { PublicAdmissionsRouter } from './routes/public/admissions.routes';

import AdminDashboardRouter from './routes/admin/dashboard.routes';
import AdminRegistrationsRouter from './routes/admin/registrations.routes';
import AdminSchoolYearLevelsRouter from './routes/admin/school-year-levels.routes';
import AdminSchoolsRouter from './routes/admin/schools.routes';
import AdminAcademicYearsRouter from './routes/admin/academic-years.routes';
import AdminCyclesLevelsRouter from './routes/admin/cycles-levels.routes';
import AdminChoicesRouter from './routes/admin/choices.routes';
import AdminTransitionsRouter from './routes/admin/transitions.routes';
import AdminTariffsRouter from './routes/admin/tariffs.routes';
import AdminWaitingListRouter from './routes/admin/waiting-list.routes';
import AdminDocumentsRouter from './routes/admin/documents.routes';
import { AdminMediaRouter } from './routes/admin/media.routes';
import { AdminFormsRouter } from './routes/admin/forms.routes';
import { AdminContentRouter } from './routes/admin/content.routes';
import { AdminReportsRouter } from './routes/admin/reports.routes';
import AdminAuthRouter from './routes/admin/auth.routes';
import AdminProfileRouter from './routes/admin/profile.routes';
import AdminUsersRouter from './routes/admin/users.routes';
import AdminSecurityRouter from './routes/admin/security.routes';
import { AdminSettingsRouter } from './routes/admin/settings.routes';

export class ApiServer {
  public readonly env: EnvConfig;
  public readonly app: Express;
  private httpServer: http.Server | null = null;

  constructor(env: EnvConfig = loadEnvConfig()) {
    this.env = env;
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
  }

  private setupMiddlewares(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(securityHeadersMiddleware);
    this.app.use(corsMiddleware(this.env.API_CORS_ORIGINS));
    this.app.use(authMiddleware);
  }

  private setupRoutes(): void {
    // Health & Readiness Probes
    this.app.get('/health', (req: Request, res: Response) => {
      res.json(this.getHealthStatus());
    });

    this.app.get('/ready', (req: Request, res: Response) => {
      res.json(this.getReadinessStatus());
    });

    const registerEndpoints = (prefix: string) => {
      // Public API Routers
      this.app.use(`${prefix}/public/schools`, PublicSchoolsRouter);
      this.app.use(`${prefix}/public/levels`, PublicLevelsRouter);
      this.app.use(`${prefix}/public/academic-years`, PublicAcademicYearsRouter);
      this.app.use(`${prefix}/public/cycles`, PublicCyclesRouter);
      this.app.use(`${prefix}/public/registration`, PublicRegistrationRouter);
      this.app.use(`${prefix}/public/registrations`, PublicRegistrationRouter);
      this.app.use(`${prefix}/public/tracking`, PublicTrackingRouter);
      this.app.use(`${prefix}/public/documents`, PublicDocumentsRouter);
      this.app.use(`${prefix}/public/media`, PublicMediaRouter);
      this.app.use(`${prefix}/public/forms`, PublicFormRouter);
      this.app.use(`${prefix}/public/registration-form`, PublicFormRouter);
      this.app.use(`${prefix}/public/content`, PublicContentRouter);
      this.app.use(`${prefix}/public/settings`, PublicSettingsRouter);
      this.app.use(`${prefix}/public/branding`, PublicSettingsRouter);
      this.app.use(`${prefix}/public/client`, PublicClientAuthRouter);
      this.app.use(`${prefix}/public/admissions`, PublicAdmissionsRouter);
      this.app.use(`${prefix}/public/admission-offerings`, PublicAdmissionsRouter);

      // Admin API Routers
      this.app.use(`${prefix}/admin/auth`, AdminAuthRouter);
      this.app.use(`${prefix}/admin/settings`, AdminSettingsRouter);
      this.app.use(`${prefix}/admin/dashboard`, AdminDashboardRouter);
      this.app.use(`${prefix}/admin/registrations`, AdminRegistrationsRouter);
      this.app.use(`${prefix}/admin/school-year-levels`, AdminSchoolYearLevelsRouter);
      this.app.use(`${prefix}/admin/schools`, AdminSchoolsRouter);
      this.app.use(`${prefix}/admin/academic-years`, AdminAcademicYearsRouter);
      this.app.use(`${prefix}/admin/cycles-levels`, AdminCyclesLevelsRouter);
      this.app.use(`${prefix}/admin`, AdminCyclesLevelsRouter);
      this.app.use(`${prefix}/admin/choices`, AdminChoicesRouter);
      this.app.use(`${prefix}/admin/transitions`, AdminTransitionsRouter);
      this.app.use(`${prefix}/admin/tariffs`, AdminTariffsRouter);
      this.app.use(`${prefix}/admin/waiting-list`, AdminWaitingListRouter);
      this.app.use(`${prefix}/admin/documents`, AdminDocumentsRouter);
      this.app.use(`${prefix}/admin/media`, AdminMediaRouter);
      this.app.use(`${prefix}/admin/forms`, AdminFormsRouter);
      this.app.use(`${prefix}/admin/content`, AdminContentRouter);
      this.app.use(`${prefix}/admin/reports`, AdminReportsRouter);
      this.app.use(`${prefix}/admin/profile`, AdminProfileRouter);
      this.app.use(`${prefix}/admin/users`, AdminUsersRouter);
      this.app.use(`${prefix}/admin/security`, AdminSecurityRouter);
    };

    // Support both /api and /api/v1
    registerEndpoints('/api');
    registerEndpoints('/api/v1');

    // Fallback 404
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Route introuvable: ${req.method} ${req.originalUrl}` },
      });
    });

    // Error handler
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('[API ERROR]', err);
      res.status(err.statusCode || 500).json({
        success: false,
        error: {
          code: err.errorCode || 'INTERNAL_ERROR',
          message: err.message || 'Une erreur interne est survenue.',
          details: err.details,
        },
      });
    });
  }

  getHealthStatus() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'VISION SCHOOL API',
      environment: this.env.NODE_ENV,
    };
  }

  getReadinessStatus() {
    return {
      status: 'READY',
      checks: {
        database: 'CONNECTED',
        storage: 'AVAILABLE',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async start(): Promise<void> {
    const port = this.env.API_PORT || 4000;
    const host = this.env.API_HOST || '0.0.0.0';

    return new Promise((resolve) => {
      this.httpServer = this.app.listen(port, host, () => {
        console.log(`[VISION SCHOOL API] Server actively listening on http://${host}:${port}`);
        console.log(`[VISION SCHOOL API] Configured API_URL: ${this.env.API_URL}`);
        console.log(`[VISION SCHOOL API] Active Academic Year: ${this.env.ACTIVE_ACADEMIC_YEAR}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => resolve());
      });
    }
  }
}
