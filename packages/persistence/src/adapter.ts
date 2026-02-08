/**
 * Database Adapter Interface
 * 
 * Abstracts the underlying database implementation.
 * Platform-specific adapters implement this interface.
 */

export type QueryResult<T = unknown> = T[];

export interface DatabaseAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
