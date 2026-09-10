/**
 * CLI launcher for running migrations.
 * Executed via: npm run db:migrate
 */

import { DatabaseClient } from '../client';
import { Migrator } from './migrator';

async function main() {
  const client = DatabaseClient.getInstance();
  try {
    await client.connect();
    await Migrator.runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

main();
