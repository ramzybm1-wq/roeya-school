/**
 * Migration runner for VISION SCHOOL database.
 * Executes database migrations deterministically.
 */

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, DatabaseClient } from '../client';
import path from 'path';

export class Migrator {
  /**
   * Runs all pending migrations against the database.
   */
  static async runMigrations(migrationsFolder?: string): Promise<void> {
    const db = getDb();
    const folder = migrationsFolder || path.join(__dirname, 'generated');
    console.log(`📦 Running migrations from: ${folder}`);
    await migrate(db, { migrationsFolder: folder });
    console.log('✅ Migrations applied successfully.');
  }

  /**
   * Resets development/test database schema safely.
   */
  static async resetDatabase(): Promise<void> {
    const client = DatabaseClient.getInstance();
    const pool = client.pgPool;

    console.log('⚠️  Resetting database schema (DEV/TEST only)...');
    await pool.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('✅ Database reset completed.');
  }
}
