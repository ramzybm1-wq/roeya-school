/**
 * CLI launcher for resetting dev/test database and re-running migrations + seed.
 * Executed via: npm run db:reset
 */

import { DatabaseClient } from '../client';
import { Migrator } from './migrator';
import { Seeder } from '../seed/seeder';

async function main() {
  const client = DatabaseClient.getInstance();
  try {
    await Migrator.resetDatabase();
    await Migrator.runMigrations();
    const db = await client.connect();
    await Seeder.seedAll(db);
    console.log('🎉 Database reset, migrated, and seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

main();
