/**
 * Unit Tests: Health & Readiness Endpoints Information Leakage Safeguards.
 */

import { ApiServer } from '../../apps/api/src/server';

describe('Security: Health & Readiness Probes Zero-Leakage', () => {
  test('health and readiness probes disclose zero credentials or database connection strings', () => {
    const server = new ApiServer();
    const health = server.getHealthStatus();
    const ready = server.getReadinessStatus();

    expect(health.status).toBe('UP');
    expect((health as any).databaseUrl).toBeUndefined();
    expect((health as any).password).toBeUndefined();

    expect(ready.status).toBe('READY');
    expect(ready.checks.database).toBe('CONNECTED');
    expect((ready as any).connectionString).toBeUndefined();
  });
});
