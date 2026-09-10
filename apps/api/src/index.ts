/**
 * @vision-school/api root entry point
 */

import { ApiServer } from './server';

export * from './server';
export * from './services/school.service';
export * from './services/academic-year.service';
export * from './services/level.service';
export * from './services/school-year-level.service';
export * from './services/capacity.service';
export * from './services/tariff.service';
export * from './services/dashboard.service';
export * from './services/registration.service';
export * from './services/waiting-list.service';
export * from './services/document.service';
export * from './services/storage.service';
export * from './services/media.service';
export * from './services/form-builder.service';
export * from './services/public-content.service';
export * from './services/contact.service';
export * from './services/faq.service';
export * from './services/report.service';
export * from './services/backup.service';
export * from './services/user.service';
export * from './services/auth.service';
export * from './services/admin-auth.service';
export * from './services/admin-user.service';
export * from './services/admin-session.service';
export * from './services/admin-two-factor.service';
export * from './services/notification.service';
export * from './services/audit.service';
export * from './services/analytics.service';
export * from './services/settings.service';
export * from './services/tracking.service';
export * from './middleware/error-handler.middleware';
export * from './middleware/logger.middleware';
export * from './middleware/auth.middleware';
export * from './middleware/rbac.middleware';
export * from './middleware/audit.middleware';
export * from './middleware/security.middleware';

const server = new ApiServer();
if (process.env.NODE_ENV !== 'test') {
  server.start().catch((err) => {
    console.error('Failed to start API server:', err);
  });
}
