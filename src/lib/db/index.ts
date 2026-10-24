import type { SQLiteDatabase } from 'expo-sqlite';

import { pendingMigrations } from './migrations';

export const DATABASE_NAME = 'devine-le-mot.db';

/** Passé à `SQLiteProvider.onInit` : réglages de connexion puis migrations en attente. */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  // foreign_keys est par connexion : indispensable pour les ON DELETE CASCADE (seen_words…).
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const pending = pendingMigrations(row?.user_version ?? 0);
  if (pending.length === 0) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const migration of pending) {
      await txn.execAsync(migration.sql);
      await txn.execAsync(`PRAGMA user_version = ${migration.version}`);
    }
  });
}
