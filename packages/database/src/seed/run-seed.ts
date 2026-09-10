/**
 * CLI launcher for database seeding.
 * Executed via: npm run db:seed
 */

import { DatabaseClient } from '../client';
import { Seeder } from './seeder';

async function main() {
  const dbClient = DatabaseClient.getInstance();
  try {
    const db = await dbClient.connect();
    await Seeder.seedAll(db);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await dbClient.disconnect();
  }
}

main();
