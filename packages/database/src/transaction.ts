/**
 * Transaction runner abstraction for VISION SCHOOL.
 * Ensures atomic processing for concurrent operations like capacity allocation,
 * registration acceptances, waiting list promotions, and document version replacements.
 */

import { getDb, VisionSchoolDb } from './client';

export type TransactionCallback<T> = (tx: Parameters<Parameters<VisionSchoolDb['transaction']>[0]>[0]) => Promise<T>;

export class TransactionRunner {
  /**
   * Executes the provided callback within an atomic PostgreSQL transaction.
   * Automatically handles BEGIN, COMMIT, and ROLLBACK.
   */
  static async run<T>(callback: TransactionCallback<T>): Promise<T> {
    const db = getDb();
    return db.transaction(async (tx) => {
      return callback(tx);
    });
  }
}
