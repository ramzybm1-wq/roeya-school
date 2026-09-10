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

  /**
   * Initializes the PostgreSQL connection pool and Drizzle ORM client.
   */
  async connect(): Promise<VisionSchoolDb> {
    if (this.dbInstance && this.pool) {
      return this.dbInstance;
    }

    const poolConfig: PoolConfig = {
      connectionString: this.env.DATABASE_URL,
      min: this.env.DATABASE_POOL_MIN,
      max: this.env.DATABASE_POOL_MAX,
    };

    this.pool = new Pool(poolConfig);
    this.dbInstance = drizzle(this.pool, { schema });

    return this.dbInstance;
  }

  /**
   * Returns the initialized Drizzle database instance.
   * If not connected yet, automatically initializes.
   */
  get db(): VisionSchoolDb {
    if (!this.dbInstance) {
      const poolConfig: PoolConfig = {
        connectionString: this.env.DATABASE_URL,
        min: this.env.DATABASE_POOL_MIN,
        max: this.env.DATABASE_POOL_MAX,
      };
      this.pool = new Pool(poolConfig);
      this.dbInstance = drizzle(this.pool, { schema });
    }
    return this.dbInstance;
  }

  /**
   * Returns the underlying pg.Pool for raw queries or migrations.
   */
  get pgPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.env.DATABASE_URL,
        min: this.env.DATABASE_POOL_MIN,
        max: this.env.DATABASE_POOL_MAX,
      });
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
