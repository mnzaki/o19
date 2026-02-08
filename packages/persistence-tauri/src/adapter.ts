/**
 * Tauri SQL Database Adapter
 * 
 * Uses the Tauri SQL plugin for cross-platform SQLite.
 */

import Database from '@tauri-apps/plugin-sql';
import type { DatabaseAdapter, QueryResult } from '@repo/persistence';

export class TauriAdapter implements DatabaseAdapter {
  private db: Database | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    this.db = await Database.load('sqlite:deardiary.db');
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Convert ? to $1, $2, etc. for Tauri SQL
    let paramIndex = 1;
    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    return this.db.select(convertedSql, params);
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Convert ? to $1, $2, etc. for Tauri SQL
    let paramIndex = 1;
    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    await this.db.execute(convertedSql, params);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.execute('BEGIN TRANSACTION');
    try {
      const result = await fn();
      await this.db.execute('COMMIT');
      return result;
    } catch (error) {
      await this.db.execute('ROLLBACK');
      throw error;
    }
  }
}
