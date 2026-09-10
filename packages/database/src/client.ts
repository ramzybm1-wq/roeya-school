/**
 * Database client foundation and connection lifecycle for VISION SCHOOL.
 * Integrates pg.Pool with Drizzle ORM and full schema type safety.
 */

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import { EnvConfig, loadEnvConfig } from '@vision-school/config';
import * as schema from './schema';

export type VisionSchoolDb = NodePgDatabase<typeof schema>;

export class DatabaseClient {
  private static instance: DatabaseClient | null = null;
  private pool: Pool | null = null;
  private dbInstance: VisionSchoolDb | null = null;
  private env: EnvConfig;

  private constructor(env: EnvConfig = loadEnvConfig()) {
    this.env = env;
  }

  static getInstance(env?: EnvConfig): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient(env);
    }
    return DatabaseClient.instance;
  }

  private getPoolConfig(): PoolConfig {
    const isSsl =
      this.env.DATABASE_URL.includes('sslmode=require') ||
      this.env.DATABASE_URL.includes('neon.tech') ||
      this.env.DATABASE_URL.includes('supabase') ||
      this.env.DATABASE_URL.includes('amazonaws.com') ||
      this.env.NODE_ENV === 'production';

    return {
      connectionString: this.env.DATABASE_URL,
      min: this.env.DATABASE_POOL_MIN,
      max: this.env.DATABASE_POOL_MAX,
      ...(isSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    };
  }

  /**
   * Initializes the PostgreSQL connection pool and Drizzle ORM client.
   */
  async connect(): Promise<VisionSchoolDb> {
    if (this.dbInstance && this.pool) {
      return this.dbInstance;
    }

    this.pool = new Pool(this.getPoolConfig());
    this.dbInstance = drizzle(this.pool, { schema });

    return this.dbInstance;
  }

  /**
   * Returns the initialized Drizzle database instance.
   * If not connected yet, automatically initializes.
   */
  get db(): VisionSchoolDb {
    if (!this.dbInstance) {
      this.pool = new Pool(this.getPoolConfig());
      this.dbInstance = drizzle(this.pool, { schema });
    }
    return this.dbInstance;
  }

  /**
   * Returns the underlying pg.Pool for raw queries or migrations.
   */
  get pgPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool(this.getPoolConfig());
    }
    return this.pool;
  }

  /**
   * Closes the connection pool gracefully.
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.dbInstance = null;
    }
  }

  get status(): { connected: boolean; connectionString: string } {
    return {
      connected: this.pool !== null,
      connectionString: this.env.DATABASE_URL ? '[CONFIGURED]' : '[MISSING]',
    };
  }
}

/**
 * Convenient singleton helper to access the database instance.
 */
export function getDb(): VisionSchoolDb {
  return DatabaseClient.getInstance().db;
}
